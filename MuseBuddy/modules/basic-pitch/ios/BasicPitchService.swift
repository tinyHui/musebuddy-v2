import AVFoundation
import CoreML
import Foundation

final class BasicPitchService: @unchecked Sendable {
  private enum State {
    case idle
    case preparing
    case recording
    case captured
    case interrupted
    case transcribing
  }

  private let workQueue = DispatchQueue(
    label: "com.musebuddy.basic-pitch",
    qos: .userInitiated
  )
  private let meterLock = NSLock()
  private let audioEngine = AVAudioEngine()
  private let maximumRecordingDuration: TimeInterval = 60
  private var state: State = .idle
  private var model: MLModel?
  private var recordingFile: AVAudioFile?
  private var recordingURL: URL?
  private var recordingStartedAt: Date?
  private var progressTimer: DispatchSourceTimer?
  private var latestLevel: Double = 0
  private var recordingWriteError: Error?

  var onProgress: (([String: Any]) -> Void)?
  var onRecordingFinished: (([String: Any]) -> Void)?

  init() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAudioSessionInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance()
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    cleanupRecording(removeFile: false)
  }

  func initialize() async throws {
    try await perform {
      if self.model != nil {
        return
      }

      guard let modelURL = self.findModelURL() else {
        throw BasicPitchError.modelResourceMissing
      }

      do {
        let configuration = MLModelConfiguration()
        configuration.computeUnits = .all
        let loadedModel = try MLModel(contentsOf: modelURL, configuration: configuration)
        try self.validate(model: loadedModel)
        self.model = loadedModel
      } catch let error as BasicPitchError {
        throw error
      } catch {
        throw BasicPitchError.modelLoadFailed(error.localizedDescription)
      }
    }
  }

  func startRecording() async throws {
    guard await requestMicrophonePermission() else {
      throw BasicPitchError.microphonePermissionDenied
    }
    try await reserveRecording()
    do {
      try await perform {
        try self.beginRecording()
      }
    } catch {
      await resetPreparingState()
      throw error
    }
  }

  func transcribeRecording() async throws -> TranscriptionResultRecord {
    try await perform {
      guard self.model != nil else {
        throw BasicPitchError.modelLoadFailed("The model has not been initialized.")
      }

      switch self.state {
      case .captured:
        self.state = .transcribing
      case .transcribing:
        throw BasicPitchError.transcriptionAlreadyRunning
      case .interrupted:
        self.cleanupRecording(removeFile: true)
        self.state = .idle
        throw BasicPitchError.audioSessionInterrupted
      case .idle, .preparing, .recording:
        throw BasicPitchError.recordingNotActive
      }

      guard let recordingURL = self.recordingURL else {
        self.state = .idle
        throw BasicPitchError.recordingNotActive
      }

      let processingStartedAt = Date()
      defer {
        self.state = .captured
      }

      do {
        let samples = try self.convertRecordingToModelSamples(url: recordingURL)
        let duration = Double(samples.count) / 22_050
        let output = try self.runInference(samples: samples)
        let decodedNotes = BasicPitchDecoder.decode(output)
        let result = TranscriptionResultRecord()
        result.recordingDurationMs = duration * 1_000
        result.processingDurationMs = Date().timeIntervalSince(processingStartedAt) * 1_000
        result.notes = decodedNotes.compactMap { note in
          let start = min(duration, BasicPitchDecoder.time(forFrame: note.startFrame))
          let end = min(duration, BasicPitchDecoder.time(forFrame: note.endFrame))
          guard end > start else {
            return nil
          }
          let record = TranscriptionNoteRecord()
          record.midiPitch = note.midiPitch
          record.startTimeMs = start * 1_000
          record.endTimeMs = end * 1_000
          record.durationMs = (end - start) * 1_000
          record.confidence = Double(note.confidence)
          record.velocity = min(127, max(0, Int((note.confidence * 127).rounded())))
          return record
        }
        return result
      } catch let error as BasicPitchError {
        throw error
      } catch {
        throw BasicPitchError.inferenceFailed(error.localizedDescription)
      }
    }
  }

  func stopRecording() async throws -> RecordingArtifactRecord {
    try await perform {
      switch self.state {
      case .recording:
        try self.finishRecordingCapture(nextState: .captured)
      case .captured:
        break
      case .interrupted:
        self.cleanupRecording(removeFile: true)
        self.state = .idle
        throw BasicPitchError.audioSessionInterrupted
      case .transcribing:
        throw BasicPitchError.transcriptionAlreadyRunning
      case .idle, .preparing:
        throw BasicPitchError.recordingNotActive
      }
      return try self.makeRecordingArtifact()
    }
  }

  func cancelRecording() async throws {
    try await perform {
      switch self.state {
      case .recording:
        self.stopAudioEngine()
      case .captured, .interrupted, .preparing:
        break
      case .transcribing:
        throw BasicPitchError.transcriptionAlreadyRunning
      case .idle:
        throw BasicPitchError.recordingNotActive
      }
      self.cleanupRecording(removeFile: true)
      self.state = .idle
    }
  }

  private func reserveRecording() async throws {
    try await perform {
      switch self.state {
      case .idle, .captured:
        self.cleanupRecording(removeFile: true)
        self.state = .preparing
      case .transcribing:
        throw BasicPitchError.transcriptionAlreadyRunning
      default:
        throw BasicPitchError.recordingAlreadyActive
      }
    }
  }

  private func resetPreparingState() async {
    await withCheckedContinuation { continuation in
      workQueue.async {
        if self.state == .preparing {
          self.state = .idle
        }
        continuation.resume()
      }
    }
  }

  private func beginRecording() throws {
    guard state == .preparing else {
      throw BasicPitchError.recordingAlreadyActive
    }

    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.record, mode: .measurement, options: [.allowBluetoothHFP])
      try session.setActive(true)
    } catch {
      throw BasicPitchError.audioConversionFailed(error.localizedDescription)
    }

    let url = try recordingFileURL()
    let inputNode = audioEngine.inputNode
    let format = inputNode.outputFormat(forBus: 0)

    guard format.sampleRate > 0, format.channelCount > 0 else {
      throw BasicPitchError.audioConversionFailed("The microphone returned an invalid format.")
    }

    do {
      let file = try AVAudioFile(forWriting: url, settings: format.settings)
      recordingFile = file
      recordingURL = url
      recordingWriteError = nil
      latestLevel = 0

      inputNode.removeTap(onBus: 0)
      inputNode.installTap(
        onBus: 0,
        bufferSize: 1_024,
        format: format
      ) { [weak self] buffer, _ in
        guard let self else {
          return
        }
        do {
          try file.write(from: buffer)
        } catch {
          recordingWriteError = error
        }
        updateLevel(from: buffer)
      }

      audioEngine.prepare()
      try audioEngine.start()
      recordingStartedAt = Date()
      state = .recording
      startProgressTimer()
    } catch {
      cleanupRecording(removeFile: true)
      throw BasicPitchError.audioConversionFailed(error.localizedDescription)
    }
  }

  private func finishRecordingCapture(nextState: State) throws {
    stopAudioEngine()
    if let recordingWriteError {
      cleanupRecording(removeFile: true)
      state = .idle
      throw BasicPitchError.audioConversionFailed(recordingWriteError.localizedDescription)
    }
    state = nextState
  }

  private func stopAudioEngine() {
    progressTimer?.cancel()
    progressTimer = nil
    if audioEngine.isRunning {
      audioEngine.stop()
    }
    audioEngine.inputNode.removeTap(onBus: 0)
    recordingFile = nil
    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: .notifyOthersOnDeactivation
    )
  }

  private func startProgressTimer() {
    let timer = DispatchSource.makeTimerSource(queue: workQueue)
    timer.schedule(deadline: .now(), repeating: .milliseconds(100))
    timer.setEventHandler { [weak self] in
      guard let self, state == .recording, let startedAt = recordingStartedAt else {
        return
      }

      let elapsed = min(Date().timeIntervalSince(startedAt), maximumRecordingDuration)
      meterLock.lock()
      let level = latestLevel
      meterLock.unlock()
      onProgress?([
        "elapsedMs": Int((elapsed * 1_000).rounded()),
        "level": level,
      ])

      if elapsed >= maximumRecordingDuration {
        do {
          try finishRecordingCapture(nextState: .captured)
          let recording = try makeRecordingArtifact()
          onRecordingFinished?([
            "uri": recording.uri,
            "durationMs": recording.durationMs,
          ])
        } catch {
          state = .interrupted
        }
      }
    }
    progressTimer = timer
    timer.resume()
  }

  private func updateLevel(from buffer: AVAudioPCMBuffer) {
    guard let channels = buffer.floatChannelData else {
      return
    }
    let frameLength = Int(buffer.frameLength)
    guard frameLength > 0 else {
      return
    }

    var squareSum: Float = 0
    for channel in 0 ..< Int(buffer.format.channelCount) {
      let samples = channels[channel]
      for frame in 0 ..< frameLength {
        let value = samples[frame]
        squareSum += value * value
      }
    }
    let sampleCount = frameLength * Int(buffer.format.channelCount)
    let rms = sqrt(squareSum / Float(sampleCount))
    let decibels = 20 * log10(max(rms, 0.000_01))
    let normalized = Double(min(1, max(0, (decibels + 60) / 60)))

    meterLock.lock()
    latestLevel = normalized
    meterLock.unlock()
  }

  private func requestMicrophonePermission() async -> Bool {
    let session = AVAudioSession.sharedInstance()
    switch session.recordPermission {
    case .granted:
      return true
    case .denied:
      return false
    case .undetermined:
      return await withCheckedContinuation { continuation in
        session.requestRecordPermission { granted in
          continuation.resume(returning: granted)
        }
      }
    @unknown default:
      return false
    }
  }

  private func convertRecordingToModelSamples(url: URL) throws -> [Float] {
    do {
      let inputFile = try AVAudioFile(forReading: url)
      guard
        let outputFormat = AVAudioFormat(
          commonFormat: .pcmFormatFloat32,
          sampleRate: 22_050,
          channels: 1,
          interleaved: false
        ),
        let converter = AVAudioConverter(from: inputFile.processingFormat, to: outputFormat)
      else {
        throw BasicPitchError.audioConversionFailed("Unable to create the audio converter.")
      }

      var samples: [Float] = []
      let inputCapacity: AVAudioFrameCount = 4_096
      var reachedEnd = false

      while !reachedEnd {
        let ratio = outputFormat.sampleRate / inputFile.processingFormat.sampleRate
        let outputCapacity = AVAudioFrameCount(ceil(Double(inputCapacity) * ratio)) + 32
        guard let outputBuffer = AVAudioPCMBuffer(
          pcmFormat: outputFormat,
          frameCapacity: outputCapacity
        ) else {
          throw BasicPitchError.audioConversionFailed("Unable to allocate an audio buffer.")
        }

        var inputSupplied = false
        var conversionError: NSError?
        let status = converter.convert(
          to: outputBuffer,
          error: &conversionError
        ) { _, inputStatus in
          if inputSupplied {
            inputStatus.pointee = .noDataNow
            return nil
          }

          let remaining = inputFile.length - inputFile.framePosition
          guard remaining > 0 else {
            inputStatus.pointee = .endOfStream
            reachedEnd = true
            return nil
          }

          let frameCount = min(inputCapacity, AVAudioFrameCount(remaining))
          guard let inputBuffer = AVAudioPCMBuffer(
            pcmFormat: inputFile.processingFormat,
            frameCapacity: frameCount
          ) else {
            inputStatus.pointee = .endOfStream
            reachedEnd = true
            return nil
          }

          do {
            try inputFile.read(into: inputBuffer, frameCount: frameCount)
            inputSupplied = true
            inputStatus.pointee = .haveData
            return inputBuffer
          } catch {
            conversionError = error as NSError
            inputStatus.pointee = .endOfStream
            reachedEnd = true
            return nil
          }
        }

        if let conversionError {
          throw conversionError
        }
        if status == .error {
          throw BasicPitchError.audioConversionFailed("AVAudioConverter reported an error.")
        }

        if let channel = outputBuffer.floatChannelData?[0] {
          samples.append(contentsOf: UnsafeBufferPointer(
            start: channel,
            count: Int(outputBuffer.frameLength)
          ))
        }
        if status == .endOfStream {
          reachedEnd = true
        }
      }

      return samples
    } catch let error as BasicPitchError {
      throw error
    } catch {
      throw BasicPitchError.audioConversionFailed(error.localizedDescription)
    }
  }

  private func runInference(samples: [Float]) throws -> ModelOutputs {
    guard let model else {
      throw BasicPitchError.modelLoadFailed("The model has not been initialized.")
    }
    guard !samples.isEmpty else {
      return ModelOutputs(frameCount: 0, notes: [], onsets: [])
    }

    let sampleCount = 43_844
    let overlapSampleCount = 30 * 256
    let leadingPadding = overlapSampleCount / 2
    let hopSize = sampleCount - overlapSampleCount
    let framesPerWindow = 172
    let overlapFramesPerSide = 15
    let retainedFramesPerWindow = framesPerWindow - (overlapFramesPerSide * 2)
    var paddedSamples = [Float](repeating: 0, count: leadingPadding)
    paddedSamples.append(contentsOf: samples)
    var noteWindows: [[Float]] = []
    var onsetWindows: [[Float]] = []
    var windowStart = 0

    do {
      while windowStart < paddedSamples.count {
        let input = try MLMultiArray(
          shape: [1, NSNumber(value: sampleCount), 1],
          dataType: .float32
        )
        for sampleIndex in 0 ..< sampleCount {
          let sourceIndex = windowStart + sampleIndex
          input[sampleIndex] = NSNumber(
            value: sourceIndex < paddedSamples.count ? paddedSamples[sourceIndex] : 0
          )
        }

        let provider = try MLDictionaryFeatureProvider(dictionary: [
          "input_2": MLFeatureValue(multiArray: input),
        ])
        let prediction = try model.prediction(from: provider)
        guard
          let noteArray = prediction.featureValue(for: "Identity_1")?.multiArrayValue,
          let onsetArray = prediction.featureValue(for: "Identity_2")?.multiArrayValue
        else {
          throw BasicPitchError.inferenceFailed("The model did not return note and onset tensors.")
        }
        noteWindows.append(
          extract(
            noteArray,
            startFrame: overlapFramesPerSide,
            frameCount: retainedFramesPerWindow,
            pitchCount: 88
          )
        )
        onsetWindows.append(
          extract(
            onsetArray,
            startFrame: overlapFramesPerSide,
            frameCount: retainedFramesPerWindow,
            pitchCount: 88
          )
        )
        windowStart += hopSize
      }
    } catch let error as BasicPitchError {
      throw error
    } catch {
      throw BasicPitchError.inferenceFailed(error.localizedDescription)
    }

    let expectedFrameCount = Int(
      (Double(samples.count) / Double(hopSize)) * Double(retainedFramesPerWindow)
    )
    let availableFrameCount = noteWindows.count * retainedFramesPerWindow
    let frameCount = min(expectedFrameCount, availableFrameCount)
    let valueCount = frameCount * 88
    return ModelOutputs(
      frameCount: frameCount,
      notes: Array(noteWindows.joined().prefix(valueCount)),
      onsets: Array(onsetWindows.joined().prefix(valueCount))
    )
  }

  private func extract(
    _ array: MLMultiArray,
    startFrame: Int,
    frameCount: Int,
    pitchCount: Int
  ) -> [Float] {
    var values = [Float]()
    values.reserveCapacity(frameCount * pitchCount)
    for frame in startFrame ..< (startFrame + frameCount) {
      for pitch in 0 ..< pitchCount {
        let offset = frame * pitchCount + pitch
        values.append(array[offset].floatValue)
      }
    }
    return values
  }

  private func validate(model: MLModel) throws {
    guard
      let input = model.modelDescription.inputDescriptionsByName["input_2"],
      let inputConstraint = input.multiArrayConstraint
    else {
      throw BasicPitchError.modelValidationFailed("Missing input_2.")
    }
    try validateShape(inputConstraint.shape, expected: [1, 43_844, 1], name: "input_2")

    let expectedOutputs = [
      "Identity": [1, 172, 264],
      "Identity_1": [1, 172, 88],
      "Identity_2": [1, 172, 88],
    ]
    for (name, expectedShape) in expectedOutputs {
      guard
        let output = model.modelDescription.outputDescriptionsByName[name],
        let constraint = output.multiArrayConstraint
      else {
        throw BasicPitchError.modelValidationFailed("Missing \(name).")
      }
      try validateShape(constraint.shape, expected: expectedShape, name: name)
    }
  }

  private func validateShape(
    _ shape: [NSNumber],
    expected: [Int],
    name: String
  ) throws {
    let actual = shape.map(\.intValue)
    guard actual == expected else {
      throw BasicPitchError.modelValidationFailed(
        "\(name) has shape \(actual), expected \(expected)."
      )
    }
  }

  private func findModelURL() -> URL? {
    let candidateBundles = [Bundle.main, Bundle(for: BasicPitchService.self)]
      + Bundle.allFrameworks
      + Bundle.allBundles
    for bundle in candidateBundles {
      if let url = bundle.url(forResource: "nmp", withExtension: "mlmodelc") {
        return url
      }
    }
    return nil
  }

  private func makeRecordingArtifact() throws -> RecordingArtifactRecord {
    guard let recordingURL else {
      throw BasicPitchError.recordingNotActive
    }

    do {
      let file = try AVAudioFile(forReading: recordingURL)
      let sampleRate = file.processingFormat.sampleRate
      guard sampleRate > 0 else {
        throw BasicPitchError.audioConversionFailed("The recording has an invalid sample rate.")
      }
      let recording = RecordingArtifactRecord()
      recording.uri = recordingURL.absoluteString
      recording.durationMs = (Double(file.length) / sampleRate) * 1_000
      return recording
    } catch let error as BasicPitchError {
      throw error
    } catch {
      throw BasicPitchError.audioConversionFailed(error.localizedDescription)
    }
  }

  private func recordingFileURL() throws -> URL {
    let fileManager = FileManager.default
    let applicationSupportURL = try fileManager.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let recordingsURL = applicationSupportURL.appendingPathComponent(
      "MuseBuddy/Recordings",
      isDirectory: true
    )
    try fileManager.createDirectory(
      at: recordingsURL,
      withIntermediateDirectories: true,
      attributes: nil
    )
    return recordingsURL.appendingPathComponent("latest-recording.wav")
  }

  private func cleanupRecording(removeFile: Bool) {
    progressTimer?.cancel()
    progressTimer = nil
    if audioEngine.isRunning {
      audioEngine.stop()
    }
    audioEngine.inputNode.removeTap(onBus: 0)
    recordingFile = nil
    recordingStartedAt = nil
    recordingWriteError = nil
    if removeFile, let recordingURL {
      try? FileManager.default.removeItem(at: recordingURL)
    }
    if removeFile {
      recordingURL = nil
    }
    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: .notifyOthersOnDeactivation
    )
  }

  @objc
  private func handleAudioSessionInterruption(_ notification: Notification) {
    guard
      let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: rawType),
      type == .began
    else {
      return
    }

    workQueue.async {
      guard self.state == .recording else {
        return
      }
      self.stopAudioEngine()
      self.state = .interrupted
    }
  }

  private func perform<T>(_ operation: @escaping () throws -> T) async throws -> T {
    try await withCheckedThrowingContinuation { continuation in
      workQueue.async {
        do {
          try continuation.resume(returning: operation())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }
}

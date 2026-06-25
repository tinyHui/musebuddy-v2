import ExpoModulesCore
import AVFoundation

public final class PianoAttackDetectorModule: Module {
  private let detector = PianoAttackDetectorService()

  public func definition() -> ModuleDefinition {
    Name("PianoAttackDetector")

    Events("onAttack", "onAmbientLevelChange")

    OnCreate {
      self.detector.onAttack = { [weak self] attack in
        self?.sendEvent("onAttack", attack)
      }
      self.detector.onAmbientLevelChange = { [weak self] ambientLevel in
        self?.sendEvent("onAmbientLevelChange", ambientLevel)
      }
    }

    OnDestroy {
      self.detector.onAttack = nil
      self.detector.onAmbientLevelChange = nil
      self.detector.stopListening()
    }

    Function("isListening") { () -> Bool in
      self.detector.isListening
    }

    AsyncFunction("startListening") { () async throws -> Void in
      do {
        try await self.detector.startListening()
      } catch let error as PianoAttackDetectorError {
        throw PianoAttackDetectorException(error)
      }
    }

    AsyncFunction("stopListening") { () async throws -> Void in
      do {
        try await self.detector.stopListeningAsync()
      } catch let error as PianoAttackDetectorError {
        throw PianoAttackDetectorException(error)
      }
    }
  }
}

private enum PianoAttackDetectorError: Error {
  case microphonePermissionDenied
  case alreadyListening
  case notListening
  case audioStartFailed(String)

  var code: String {
    switch self {
    case .microphonePermissionDenied:
      return "ERR_MICROPHONE_PERMISSION_DENIED"
    case .alreadyListening:
      return "ERR_ATTACK_DETECTOR_ALREADY_LISTENING"
    case .notListening:
      return "ERR_ATTACK_DETECTOR_NOT_LISTENING"
    case .audioStartFailed:
      return "ERR_ATTACK_DETECTOR_AUDIO_START_FAILED"
    }
  }

  var message: String {
    switch self {
    case .microphonePermissionDenied:
      return "Microphone permission was denied."
    case .alreadyListening:
      return "The piano attack detector is already listening."
    case .notListening:
      return "The piano attack detector is not listening."
    case .audioStartFailed(let detail):
      return "The piano attack detector could not start audio input: \(detail)"
    }
  }
}

private final class PianoAttackDetectorException: Exception, @unchecked Sendable {
  private let error: PianoAttackDetectorError

  init(_ error: PianoAttackDetectorError) {
    self.error = error
    super.init()
  }

  override var reason: String {
    error.message
  }

  override var code: String {
    error.code
  }
}

private final class PianoAttackDetectorService: @unchecked Sendable {
  private struct DetectionConfiguration {
    let bufferSize: AVAudioFrameCount = 256
    let baselineFrameCount = 96
    let recentFrameCount = 2
    let warmupDurationMs: Double = 300
    let absoluteFloorDb = -48.0
    let baselineDeltaDb = 5.0
    let recentDeltaDb = 2.5
    let cooldownMs: Double = 55
  }

  private let audioEngine = AVAudioEngine()
  private let queue = DispatchQueue(label: "com.musebuddy.piano-attack-detector")
  private let configuration = DetectionConfiguration()
  private var listening = false
  private var baselineWindow: [Double] = []
  private var recentWindow: [Double] = []
  private var startedAt: Date?
  private var lastAttackAt: Date?
  private var lastAmbientLevelDb: Int?
  private var isArmed = true
  private var nextAttackId = 0

  var onAttack: (([String: Any]) -> Void)?
  var onAmbientLevelChange: (([String: Any]) -> Void)?

  var isListening: Bool {
    queue.sync {
      listening
    }
  }

  func startListening() async throws {
    guard await requestMicrophonePermission() else {
      throw PianoAttackDetectorError.microphonePermissionDenied
    }

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      queue.async {
        do {
          try self.startListeningOnQueue()
          continuation.resume()
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  func stopListeningAsync() async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      queue.async {
        guard self.listening else {
          continuation.resume(throwing: PianoAttackDetectorError.notListening)
          return
        }

        self.stopListeningOnQueue()
        continuation.resume()
      }
    }
  }

  func stopListening() {
    queue.sync {
      guard listening else {
        return
      }
      stopListeningOnQueue()
    }
  }

  private func startListeningOnQueue() throws {
    guard !listening else {
      throw PianoAttackDetectorError.alreadyListening
    }

    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.record, mode: .measurement, options: [.allowBluetoothHFP])
      try session.setActive(true)
    } catch {
      throw PianoAttackDetectorError.audioStartFailed(error.localizedDescription)
    }

    let inputNode = audioEngine.inputNode
    let format = inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else {
      throw PianoAttackDetectorError.audioStartFailed("The microphone returned an invalid format.")
    }

    resetDetectionState()

    inputNode.removeTap(onBus: 0)
    inputNode.installTap(
      onBus: 0,
      bufferSize: configuration.bufferSize,
      format: format
    ) { [weak self] buffer, _ in
      self?.process(buffer: buffer)
    }

    do {
      audioEngine.prepare()
      try audioEngine.start()
      listening = true
      startedAt = Date()
    } catch {
      inputNode.removeTap(onBus: 0)
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
      throw PianoAttackDetectorError.audioStartFailed(error.localizedDescription)
    }
  }

  private func stopListeningOnQueue() {
    if audioEngine.isRunning {
      audioEngine.stop()
    }
    audioEngine.inputNode.removeTap(onBus: 0)
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    listening = false
    resetDetectionState()
  }

  private func resetDetectionState() {
    baselineWindow.removeAll(keepingCapacity: true)
    recentWindow.removeAll(keepingCapacity: true)
    startedAt = nil
    lastAttackAt = nil
    lastAmbientLevelDb = nil
    isArmed = true
  }

  private func process(buffer: AVAudioPCMBuffer) {
    guard let levelDb = levelDb(from: buffer) else {
      return
    }

    queue.async {
      guard self.listening, let startedAt = self.startedAt else {
        return
      }

      let now = Date()
      let elapsedMs = now.timeIntervalSince(startedAt) * 1_000
      let ambientDb = self.average(self.baselineWindow) ?? levelDb
      let hasRecentHistory = self.recentWindow.count >= self.configuration.recentFrameCount
      let recentDb = hasRecentHistory ? self.average(self.recentWindow) ?? ambientDb : ambientDb
      let deltaDb = levelDb - ambientDb
      let onsetStrength = levelDb - recentDb
      let cooldownElapsedMs = self.lastAttackAt.map { now.timeIntervalSince($0) * 1_000 } ?? .infinity
      let warmedUp = elapsedMs >= self.configuration.warmupDurationMs
        && self.baselineWindow.count >= self.configuration.recentFrameCount

      let isAttack = warmedUp
        && self.isArmed
        && levelDb >= self.configuration.absoluteFloorDb
        && deltaDb >= self.configuration.baselineDeltaDb
        && hasRecentHistory
        && onsetStrength >= self.configuration.recentDeltaDb

      if isAttack {
        self.isArmed = false
        self.lastAttackAt = now
        self.nextAttackId += 1
        let payload: [String: Any] = [
          "id": self.nextAttackId,
          "timestampMs": elapsedMs,
          "levelDb": levelDb,
          "ambientDb": ambientDb,
          "deltaDb": deltaDb,
          "onsetStrengthDb": onsetStrength,
        ]
        DispatchQueue.main.async { [weak self] in
          self?.onAttack?(payload)
        }
      }

      if !self.isArmed
        && cooldownElapsedMs >= self.configuration.cooldownMs
        && onsetStrength < 1.0 {
        self.isArmed = true
      }

      let shouldUpdateBaseline = !isAttack
        && cooldownElapsedMs >= self.configuration.cooldownMs
        && levelDb < ambientDb + 3.0

      if shouldUpdateBaseline {
        self.append(levelDb, to: &self.baselineWindow, limit: self.configuration.baselineFrameCount)
      }
      self.append(levelDb, to: &self.recentWindow, limit: self.configuration.recentFrameCount)

      let updatedAmbientDb = self.average(self.baselineWindow) ?? levelDb
      self.emitAmbientLevelChangeIfNeeded(levelDb: updatedAmbientDb, timestampMs: elapsedMs)
    }
  }

  private func emitAmbientLevelChangeIfNeeded(levelDb: Double, timestampMs: Double) {
    let roundedLevelDb = Int(levelDb.rounded())
    guard roundedLevelDb != lastAmbientLevelDb else {
      return
    }

    lastAmbientLevelDb = roundedLevelDb
    let payload: [String: Any] = [
      "levelDb": levelDb,
      "roundedLevelDb": roundedLevelDb,
      "timestampMs": timestampMs,
    ]
    DispatchQueue.main.async { [weak self] in
      self?.onAmbientLevelChange?(payload)
    }
  }

  private func levelDb(from buffer: AVAudioPCMBuffer) -> Double? {
    guard let channels = buffer.floatChannelData else {
      return nil
    }

    let frameLength = Int(buffer.frameLength)
    let channelCount = Int(buffer.format.channelCount)
    guard frameLength > 0, channelCount > 0 else {
      return nil
    }

    var squareSum: Float = 0
    for channel in 0..<channelCount {
      let samples = channels[channel]
      for frame in 0..<frameLength {
        let value = samples[frame]
        squareSum += value * value
      }
    }

    let sampleCount = frameLength * channelCount
    let rms = sqrt(squareSum / Float(sampleCount))
    return 20 * log10(Double(max(rms, 0.000_01)))
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

  private func average(_ values: [Double]) -> Double? {
    guard !values.isEmpty else {
      return nil
    }
    return values.reduce(0, +) / Double(values.count)
  }

  private func append(_ value: Double, to values: inout [Double], limit: Int) {
    values.append(value)
    if values.count > limit {
      values.removeFirst(values.count - limit)
    }
  }
}

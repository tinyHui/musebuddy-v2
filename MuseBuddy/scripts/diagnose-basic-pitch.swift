import AVFoundation
import CoreML
import Foundation

private enum DiagnosticError: LocalizedError {
  case invalidArguments
  case missingFeature(String)
  case unexpectedShape(name: String, actual: [Int], expected: [Int])
  case audioConversionFailed(String)
  case inferenceFailed(String)

  var errorDescription: String? {
    switch self {
    case .invalidArguments:
      return "Usage: swift diagnose-basic-pitch.swift /path/to/nmp.mlmodelc [/path/to/test-record.mp3]"
    case .missingFeature(let name):
      return "The model feature '\(name)' is missing."
    case .unexpectedShape(let name, let actual, let expected):
      return "\(name) has shape \(actual), expected \(expected)."
    case .audioConversionFailed(let detail):
      return "Audio conversion failed: \(detail)"
    case .inferenceFailed(let detail):
      return "Basic Pitch inference failed: \(detail)"
    }
  }
}

private struct ModelOutputs {
  let frameCount: Int
  let notes: [Float]
  let onsets: [Float]
}

private struct DecodedNote {
  let startFrame: Int
  let endFrame: Int
  let midiPitch: Int
  let confidence: Float
}

private struct TranscriptionNote {
  let midiPitch: Int
  let startTimeMs: Double
  let endTimeMs: Double
  let durationMs: Double
  let confidence: Float
  let velocity: Int
}

private enum BasicPitchDecoder {
  private static let pitchCount = 88
  private static let midiOffset = 21
  private static let frameThreshold: Float = 0.3
  private static let onsetThreshold: Float = 0.5
  private static let minimumNoteLength = 11
  private static let energyTolerance = 11
  private static let fftHop = 256
  private static let sampleRate = 22_050
  private static let annotationFramesPerWindow = 172
  private static let audioSampleCount = 43_844
  private static let alignmentOffset = 0.0018

  static func decode(_ output: ModelOutputs) -> [DecodedNote] {
    guard output.frameCount > 2 else {
      return []
    }

    let inferredOnsets = inferOnsets(
      onsets: output.onsets,
      frames: output.notes,
      frameCount: output.frameCount
    )
    var remainingEnergy = output.notes
    var events: [DecodedNote] = []
    var onsetPeaks: [(time: Int, pitch: Int)] = []

    for time in 1..<(output.frameCount - 1) {
      for pitch in 0..<pitchCount {
        let value = inferredOnsets[index(time, pitch)]
        if value >= onsetThreshold,
          value > inferredOnsets[index(time - 1, pitch)],
          value > inferredOnsets[index(time + 1, pitch)]
        {
          onsetPeaks.append((time, pitch))
        }
      }
    }

    for peak in onsetPeaks.reversed() {
      guard peak.time < output.frameCount - 1 else {
        continue
      }

      var time = peak.time + 1
      var quietFrames = 0
      while time < output.frameCount - 1 && quietFrames < energyTolerance {
        if remainingEnergy[index(time, peak.pitch)] < frameThreshold {
          quietFrames += 1
        } else {
          quietFrames = 0
        }
        time += 1
      }
      time -= quietFrames

      guard time - peak.time > minimumNoteLength else {
        continue
      }

      let confidence = mean(output.notes, from: peak.time, to: time, pitch: peak.pitch)
      clearEnergy(&remainingEnergy, from: peak.time, to: time, pitch: peak.pitch)
      events.append(
        DecodedNote(
          startFrame: peak.time,
          endFrame: time,
          midiPitch: peak.pitch + midiOffset,
          confidence: confidence
        )
      )
    }

    while let maximum = maximumEnergy(in: remainingEnergy),
      maximum.value > frameThreshold
    {
      remainingEnergy[index(maximum.time, maximum.pitch)] = 0

      var forwardTime = maximum.time + 1
      var quietFrames = 0
      while forwardTime < output.frameCount - 1 && quietFrames < energyTolerance {
        if remainingEnergy[index(forwardTime, maximum.pitch)] < frameThreshold {
          quietFrames += 1
        } else {
          quietFrames = 0
        }
        clearEnergy(&remainingEnergy, from: forwardTime, to: forwardTime + 1, pitch: maximum.pitch)
        forwardTime += 1
      }
      let end = forwardTime - 1 - quietFrames

      var backwardTime = maximum.time - 1
      quietFrames = 0
      while backwardTime > 0 && quietFrames < energyTolerance {
        if remainingEnergy[index(backwardTime, maximum.pitch)] < frameThreshold {
          quietFrames += 1
        } else {
          quietFrames = 0
        }
        clearEnergy(&remainingEnergy, from: backwardTime, to: backwardTime + 1, pitch: maximum.pitch)
        backwardTime -= 1
      }
      let start = backwardTime + 1 + quietFrames

      guard end - start > minimumNoteLength else {
        continue
      }

      events.append(
        DecodedNote(
          startFrame: start,
          endFrame: end,
          midiPitch: maximum.pitch + midiOffset,
          confidence: mean(output.notes, from: start, to: end, pitch: maximum.pitch)
        )
      )
    }

    return events.sorted {
      if $0.startFrame == $1.startFrame {
        return $0.midiPitch < $1.midiPitch
      }
      return $0.startFrame < $1.startFrame
    }
  }

  static func time(forFrame frame: Int) -> Double {
    let originalTime = Double(frame * fftHop) / Double(sampleRate)
    let windowNumber = floor(Double(frame) / Double(annotationFramesPerWindow))
    let windowOffset =
      (Double(fftHop) / Double(sampleRate))
      * (Double(annotationFramesPerWindow) - (Double(audioSampleCount) / Double(fftHop)))
      + alignmentOffset
    return max(0, originalTime - (windowOffset * windowNumber))
  }

  private static func inferOnsets(
    onsets: [Float],
    frames: [Float],
    frameCount: Int
  ) -> [Float] {
    var frameDifferences = [Float](repeating: 0, count: onsets.count)
    var maximumOnset: Float = 0
    var maximumDifference: Float = 0

    for value in onsets {
      maximumOnset = max(maximumOnset, value)
    }

    for time in 2..<frameCount {
      for pitch in 0..<pitchCount {
        let current = frames[index(time, pitch)]
        let oneFrameDifference = current - frames[index(time - 1, pitch)]
        let twoFrameDifference = current - frames[index(time - 2, pitch)]
        let difference = max(0, min(oneFrameDifference, twoFrameDifference))
        frameDifferences[index(time, pitch)] = difference
        maximumDifference = max(maximumDifference, difference)
      }
    }

    guard maximumDifference > 0 else {
      return onsets
    }

    return zip(onsets, frameDifferences).map { onset, difference in
      max(onset, maximumOnset * difference / maximumDifference)
    }
  }

  private static func clearEnergy(
    _ energy: inout [Float],
    from start: Int,
    to end: Int,
    pitch: Int
  ) {
    guard start < end else {
      return
    }
    for time in start..<end {
      energy[index(time, pitch)] = 0
      if pitch > 0 {
        energy[index(time, pitch - 1)] = 0
      }
      if pitch < pitchCount - 1 {
        energy[index(time, pitch + 1)] = 0
      }
    }
  }

  private static func mean(_ values: [Float], from start: Int, to end: Int, pitch: Int) -> Float {
    guard end > start else {
      return 0
    }
    var sum: Float = 0
    for time in start..<end {
      sum += values[index(time, pitch)]
    }
    return sum / Float(end - start)
  }

  private static func maximumEnergy(in energy: [Float]) -> (
    time: Int,
    pitch: Int,
    value: Float
  )? {
    guard !energy.isEmpty else {
      return nil
    }
    var maximumIndex = 0
    var maximumValue = energy[0]
    for candidate in 1..<energy.count where energy[candidate] > maximumValue {
      maximumIndex = candidate
      maximumValue = energy[candidate]
    }
    return (maximumIndex / pitchCount, maximumIndex % pitchCount, maximumValue)
  }

  private static func index(_ time: Int, _ pitch: Int) -> Int {
    time * pitchCount + pitch
  }
}

private func shape(of array: MLMultiArray) -> [Int] {
  array.shape.map(\.intValue)
}

private func validateShape(
  _ array: MLMultiArray,
  name: String,
  expected: [Int]
) throws {
  let actual = shape(of: array)
  guard actual == expected else {
    throw DiagnosticError.unexpectedShape(name: name, actual: actual, expected: expected)
  }
}

private func validate(model: MLModel) throws {
  guard
    let inputDescription = model.modelDescription.inputDescriptionsByName["input_2"],
    let inputConstraint = inputDescription.multiArrayConstraint
  else {
    throw DiagnosticError.missingFeature("input_2")
  }

  let inputShape = inputConstraint.shape.map(\.intValue)
  guard inputShape == [1, 43_844, 1] else {
    throw DiagnosticError.unexpectedShape(
      name: "input_2",
      actual: inputShape,
      expected: [1, 43_844, 1]
    )
  }

  let expectedOutputs = [
    "Identity": [1, 172, 264],
    "Identity_1": [1, 172, 88],
    "Identity_2": [1, 172, 88],
  ]
  for (name, expectedShape) in expectedOutputs {
    guard
      let outputDescription = model.modelDescription.outputDescriptionsByName[name],
      let outputConstraint = outputDescription.multiArrayConstraint
    else {
      throw DiagnosticError.missingFeature(name)
    }

    let actualShape = outputConstraint.shape.map(\.intValue)
    guard actualShape == expectedShape else {
      throw DiagnosticError.unexpectedShape(name: name, actual: actualShape, expected: expectedShape)
    }
  }
}

private func convertAudioToModelSamples(url: URL) throws -> [Float] {
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
      throw DiagnosticError.audioConversionFailed("Unable to create the audio converter.")
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
        throw DiagnosticError.audioConversionFailed("Unable to allocate an audio buffer.")
      }

      var inputSupplied = false
      var conversionError: NSError?
      let status = converter.convert(to: outputBuffer, error: &conversionError) { _, inputStatus in
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
        throw DiagnosticError.audioConversionFailed("AVAudioConverter reported an error.")
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
  } catch let error as DiagnosticError {
    throw error
  } catch {
    throw DiagnosticError.audioConversionFailed(error.localizedDescription)
  }
}

private func extract(
  _ array: MLMultiArray,
  startFrame: Int,
  frameCount: Int,
  pitchCount: Int
) -> [Float] {
  var values = [Float]()
  values.reserveCapacity(frameCount * pitchCount)
  for frame in startFrame..<(startFrame + frameCount) {
    for pitch in 0..<pitchCount {
      let offset = frame * pitchCount + pitch
      values.append(array[offset].floatValue)
    }
  }
  return values
}

private func runInference(samples: [Float], model: MLModel) throws -> ModelOutputs {
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
      let inputSamples = input.dataPointer.bindMemory(to: Float.self, capacity: sampleCount)
      for sampleIndex in 0..<sampleCount {
        let sourceIndex = windowStart + sampleIndex
        inputSamples[sampleIndex] = sourceIndex < paddedSamples.count ? paddedSamples[sourceIndex] : 0
      }

      let provider = try MLDictionaryFeatureProvider(dictionary: [
        "input_2": MLFeatureValue(multiArray: input)
      ])
      let prediction = try model.prediction(from: provider)
      guard
        let noteArray = prediction.featureValue(for: "Identity_1")?.multiArrayValue,
        let onsetArray = prediction.featureValue(for: "Identity_2")?.multiArrayValue
      else {
        throw DiagnosticError.inferenceFailed("The model did not return note and onset tensors.")
      }

      try validateShape(noteArray, name: "Identity_1", expected: [1, 172, 88])
      try validateShape(onsetArray, name: "Identity_2", expected: [1, 172, 88])
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
  } catch let error as DiagnosticError {
    throw error
  } catch {
    throw DiagnosticError.inferenceFailed(error.localizedDescription)
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

private func transcribe(audioURL: URL, model: MLModel) throws -> (durationMs: Double, notes: [TranscriptionNote]) {
  let samples = try convertAudioToModelSamples(url: audioURL)
  let durationSeconds = Double(samples.count) / 22_050
  let output = try runInference(samples: samples, model: model)
  let decodedNotes = BasicPitchDecoder.decode(output)
  let notes = decodedNotes.compactMap { note -> TranscriptionNote? in
    let start = min(durationSeconds, BasicPitchDecoder.time(forFrame: note.startFrame))
    let end = min(durationSeconds, BasicPitchDecoder.time(forFrame: note.endFrame))
    guard end > start else {
      return nil
    }

    return TranscriptionNote(
      midiPitch: note.midiPitch,
      startTimeMs: start * 1_000,
      endTimeMs: end * 1_000,
      durationMs: (end - start) * 1_000,
      confidence: note.confidence,
      velocity: min(127, max(0, Int((note.confidence * 127).rounded())))
    )
  }

  return (durationSeconds * 1_000, notes)
}

private func defaultAudioURL() -> URL {
  URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("data/test-record.mp3")
}

private func formatMilliseconds(_ value: Double) -> String {
  String(format: "%.1fms", value)
}

private func formatDecimal(_ value: Float) -> String {
  String(format: "%.4f", value)
}

private func run() throws {
  guard (2...3).contains(CommandLine.arguments.count) else {
    throw DiagnosticError.invalidArguments
  }

  let compiledURL = URL(fileURLWithPath: CommandLine.arguments[1])
  let audioURL = CommandLine.arguments.count == 3
    ? URL(fileURLWithPath: CommandLine.arguments[2])
    : defaultAudioURL()

  let configuration = MLModelConfiguration()
  configuration.computeUnits = .cpuOnly
  let model = try MLModel(contentsOf: compiledURL, configuration: configuration)
  try validate(model: model)

  let result = try transcribe(audioURL: audioURL, model: model)

  print("Audio: \(audioURL.path)")
  print("Model: \(compiledURL.path)")
  print("Duration: \(formatMilliseconds(result.durationMs))")
  print("Notes: \(result.notes.count)")

  for note in result.notes {
    print(
      "pitch \(note.midiPitch) | "
        + "start \(formatMilliseconds(note.startTimeMs)) | "
        + "end \(formatMilliseconds(note.endTimeMs)) | "
        + "duration \(formatMilliseconds(note.durationMs)) | "
        + "confidence \(formatDecimal(note.confidence)) | "
        + "velocity \(note.velocity)"
    )
  }
}

do {
  try run()
} catch {
  let message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
  FileHandle.standardError.write(Data("FAIL: \(message)\n".utf8))
  exit(1)
}

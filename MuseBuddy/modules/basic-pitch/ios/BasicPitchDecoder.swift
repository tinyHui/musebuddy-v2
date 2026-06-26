import Foundation

enum BasicPitchDecoder {
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

    for time in 1 ..< (output.frameCount - 1) {
      for pitch in 0 ..< pitchCount {
        let value = inferredOnsets[index(time, pitch)]
        if value >= onsetThreshold,
           value > inferredOnsets[index(time - 1, pitch)],
           value > inferredOnsets[index(time + 1, pitch)] {
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
      while time < output.frameCount - 1, quietFrames < energyTolerance {
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

      let confidence = mean(
        output.notes,
        from: peak.time,
        to: time,
        pitch: peak.pitch
      )
      clearEnergy(
        &remainingEnergy,
        from: peak.time,
        to: time,
        pitch: peak.pitch
      )
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
          maximum.value > frameThreshold {
      remainingEnergy[index(maximum.time, maximum.pitch)] = 0

      var forwardTime = maximum.time + 1
      var quietFrames = 0
      while forwardTime < output.frameCount - 1, quietFrames < energyTolerance {
        if remainingEnergy[index(forwardTime, maximum.pitch)] < frameThreshold {
          quietFrames += 1
        } else {
          quietFrames = 0
        }
        clearEnergy(
          &remainingEnergy,
          from: forwardTime,
          to: forwardTime + 1,
          pitch: maximum.pitch
        )
        forwardTime += 1
      }
      let end = forwardTime - 1 - quietFrames

      var backwardTime = maximum.time - 1
      quietFrames = 0
      while backwardTime > 0, quietFrames < energyTolerance {
        if remainingEnergy[index(backwardTime, maximum.pitch)] < frameThreshold {
          quietFrames += 1
        } else {
          quietFrames = 0
        }
        clearEnergy(
          &remainingEnergy,
          from: backwardTime,
          to: backwardTime + 1,
          pitch: maximum.pitch
        )
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

    for time in 2 ..< frameCount {
      for pitch in 0 ..< pitchCount {
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
    for time in start ..< end {
      energy[index(time, pitch)] = 0
      if pitch > 0 {
        energy[index(time, pitch - 1)] = 0
      }
      if pitch < pitchCount - 1 {
        energy[index(time, pitch + 1)] = 0
      }
    }
  }

  private static func mean(
    _ values: [Float],
    from start: Int,
    to end: Int,
    pitch: Int
  ) -> Float {
    guard end > start else {
      return 0
    }
    var sum: Float = 0
    for time in start ..< end {
      sum += values[index(time, pitch)]
    }
    return sum / Float(end - start)
  }

  private static func maximumEnergy(
    in energy: [Float]
  ) -> (time: Int, pitch: Int, value: Float)? {
    guard !energy.isEmpty else {
      return nil
    }
    var maximumIndex = 0
    var maximumValue = energy[0]
    for candidate in 1 ..< energy.count where energy[candidate] > maximumValue {
      maximumIndex = candidate
      maximumValue = energy[candidate]
    }
    return (
      maximumIndex / pitchCount,
      maximumIndex % pitchCount,
      maximumValue
    )
  }

  private static func index(_ time: Int, _ pitch: Int) -> Int {
    time * pitchCount + pitch
  }
}

import Accelerate
import AVFoundation
import ExpoModulesCore
import Foundation
import UIKit

public final class PianoAttackDetectorModule: Module {
  private let detector = PianoAttackDetectorService()

  public func definition() -> ModuleDefinition {
    Name("PianoAttackDetector")

    Events("onAttack", "onRelease", "onAmbientLevelChange")

    OnCreate {
      self.detector.onAttack = { [weak self] attack in
        self?.sendEvent("onAttack", attack)
      }
      self.detector.onRelease = { [weak self] release in
        self?.sendEvent("onRelease", release)
      }
      self.detector.onAmbientLevelChange = { [weak self] ambientLevel in
        self?.sendEvent("onAmbientLevelChange", ambientLevel)
      }
    }

    OnDestroy {
      self.detector.onAttack = nil
      self.detector.onRelease = nil
      self.detector.onAmbientLevelChange = nil
      self.detector.stopListening()
    }

    Function("isListening") { () -> Bool in
      self.detector.isListening
    }

    AsyncFunction("startListening") { (options: [String: Double]) async throws -> Void in
      do {
        try await self.detector.startListening(options: options)
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

    AsyncFunction("getArtifactFiles") { () async -> [String: String] in
      self.detector.artifactFiles()
    }

    AsyncFunction("shareArtifact") { (kind: String) async throws -> Void in
      do {
        try await self.detector.shareArtifact(kind: kind)
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
  case artifactUnavailable(String)
  case shareFailed(String)

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
    case .artifactUnavailable:
      return "ERR_ATTACK_DETECTOR_ARTIFACT_UNAVAILABLE"
    case .shareFailed:
      return "ERR_ATTACK_DETECTOR_SHARE_FAILED"
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
    case .artifactUnavailable(let detail):
      return "The piano attack detector artifact is unavailable: \(detail)"
    case .shareFailed(let detail):
      return "The piano attack detector could not share the artifact: \(detail)"
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

private enum PianoDetectionEventType: String {
  case attack
  case release
}

private struct PianoDetectionEvent {
  let timeMs: Int64
  let emittedAtMs: Int64
  let dB: Float
  let score: Float
  let type: PianoDetectionEventType
  let threshold: Float
  let noiseDb: Float
}

private struct PianoAttackConfiguration {
  var sampleRate: Float
  var frameMs: Float = 32.0
  var hopMs: Float = 10.0
  var nMels: Int = 64
  var fMin: Float = 30.0
  var fMax: Float = 10_000.0
  var lag: Int = 1
  var maxFilterSize: Int = 3
  var warmupMs: Float = 400.0
  var noiseWindowSec: Float = 2.0
  var scoreWindowSec: Float = 1.5
  var thresholdK: Float = 3.2
  var absScoreFloor: Float = 0.07
  var absoluteFloorDb: Float = -48.0
  var minSnrDb: Float = 6.0
  var confirmMs: Float = 20.0
  var minAttackIntervalMs: Float = 70.0
  var releaseSnrDb: Float = 5.0
  var releaseHoldMs: Float = 120.0
  var releaseDropDb: Float = 24.0

  init(sampleRate: Float, options: [String: Double]) {
    self.sampleRate = sampleRate

    frameMs = Self.floatOption("frameMs", in: options, defaultValue: frameMs, minValue: 4.0)
    hopMs = Self.floatOption("hopMs", in: options, defaultValue: hopMs, minValue: 1.0)
    nMels = Self.intOption("nMels", in: options, defaultValue: nMels, minValue: 8)
    fMin = Self.floatOption("fMin", in: options, defaultValue: fMin, minValue: 0.0)
    fMax = Self.floatOption("fMax", in: options, defaultValue: fMax, minValue: 100.0)
    lag = Self.intOption("lag", in: options, defaultValue: lag, minValue: 1)
    maxFilterSize = Self.intOption("maxFilterSize", in: options, defaultValue: maxFilterSize, minValue: 1)
    warmupMs = Self.floatOption("warmupMs", in: options, defaultValue: warmupMs, minValue: 0.0)
    noiseWindowSec = Self.floatOption("noiseWindowSec", in: options, defaultValue: noiseWindowSec, minValue: 0.1)
    scoreWindowSec = Self.floatOption("scoreWindowSec", in: options, defaultValue: scoreWindowSec, minValue: 0.1)
    thresholdK = Self.floatOption("thresholdK", in: options, defaultValue: thresholdK, minValue: 0.1)
    absScoreFloor = Self.floatOption("absScoreFloor", in: options, defaultValue: absScoreFloor, minValue: 0.0)
    absoluteFloorDb = Self.floatOption(
      "absoluteFloorDb",
      in: options,
      defaultValue: absoluteFloorDb,
      minValue: -120.0
    )
    minSnrDb = Self.floatOption("minSnrDb", in: options, defaultValue: minSnrDb, minValue: 0.0)
    confirmMs = Self.floatOption("confirmMs", in: options, defaultValue: confirmMs, minValue: 0.0)
    minAttackIntervalMs = Self.floatOption(
      "minAttackIntervalMs",
      in: options,
      defaultValue: minAttackIntervalMs,
      minValue: 0.0
    )
    releaseSnrDb = Self.floatOption("releaseSnrDb", in: options, defaultValue: releaseSnrDb, minValue: 0.0)
    releaseHoldMs = Self.floatOption("releaseHoldMs", in: options, defaultValue: releaseHoldMs, minValue: 0.0)
    releaseDropDb = Self.floatOption("releaseDropDb", in: options, defaultValue: releaseDropDb, minValue: 1.0)

    if fMax <= fMin {
      fMax = fMin + 100.0
    }
  }

  private static func floatOption(
    _ key: String,
    in options: [String: Double],
    defaultValue: Float,
    minValue: Float
  ) -> Float {
    guard let value = options[key], value.isFinite else {
      return defaultValue
    }
    return max(Float(value), minValue)
  }

  private static func intOption(
    _ key: String,
    in options: [String: Double],
    defaultValue: Int,
    minValue: Int
  ) -> Int {
    guard let value = options[key], value.isFinite else {
      return defaultValue
    }
    return max(Int(value.rounded()), minValue)
  }
}

private final class RealtimePianoAttackDetector {
  private struct PendingAttack {
    var timeMs: Int64
    var score: Float
    var threshold: Float
    var rmsDb: Float
    var noiseDb: Float
    var ageFrames: Int
  }

  private let config: PianoAttackConfiguration
  private let frameLength: Int
  private let hopLength: Int
  private let nFFT: Int
  private let log2n: vDSP_Length
  private let maxScoreHistoryCount: Int
  private let maxRmsHistoryCount: Int
  private let warmupFrames: Int
  private let confirmFrames: Int
  private let releaseHoldFrames: Int

  private var window: [Float]
  private var melFilterbank: [[Float]]
  private var highFrequencyWeights: [Float]
  private var fftSetup: FFTSetup?

  private var sampleBuffer: [Float] = []
  private var frameStartSample: Int64 = 0
  private var previousLogMels: [[Float]] = []
  private var previousRmsDb: Float = -120.0
  private var scoreHistory: [Float] = []
  private var rmsHistory: [Float] = []
  private var pendingAttack: PendingAttack?
  private var lastAttackTimeMs: Int64 = -1_000_000_000
  private var isActive = false
  private var activePeakDb: Float = -120.0
  private var belowReleaseCount = 0
  private var latestNoiseDb: Float = -90.0
  private var latestFrameTimeMs: Int64 = 0

  init(config: PianoAttackConfiguration) {
    self.config = config
    frameLength = max(16, Int(round(config.sampleRate * config.frameMs / 1000.0)))
    hopLength = max(1, Int(round(config.sampleRate * config.hopMs / 1000.0)))
    nFFT = Self.nextPowerOfTwo(frameLength)
    log2n = vDSP_Length(log2(Float(nFFT)))
    maxScoreHistoryCount = max(8, Int(config.scoreWindowSec / (config.hopMs / 1000.0)))
    maxRmsHistoryCount = max(8, Int(config.noiseWindowSec / (config.hopMs / 1000.0)))
    warmupFrames = max(1, Int(ceil(config.warmupMs / config.hopMs)))
    confirmFrames = max(1, Int(ceil(config.confirmMs / config.hopMs)))
    releaseHoldFrames = max(1, Int(ceil(config.releaseHoldMs / config.hopMs)))
    window = Self.hannWindow(count: frameLength)

    let effectiveFMax = min(config.fMax, config.sampleRate / 2.0)
    melFilterbank = Self.makeMelFilterbank(
      sampleRate: config.sampleRate,
      nFFT: nFFT,
      nMels: config.nMels,
      fMin: config.fMin,
      fMax: effectiveFMax
    )
    let melCenters = Self.melCenterFrequencies(nMels: config.nMels, fMin: config.fMin, fMax: effectiveFMax)
    highFrequencyWeights = melCenters.map { freq in
      pow(freq / max(effectiveFMax, 1.0), 0.7)
    }
    fftSetup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2))
  }

  deinit {
    if let fftSetup {
      vDSP_destroy_fftsetup(fftSetup)
    }
  }

  var noiseDb: Float {
    latestNoiseDb
  }

  var currentTimeMs: Int64 {
    latestFrameTimeMs
  }

  func reset() {
    sampleBuffer.removeAll(keepingCapacity: true)
    frameStartSample = 0
    previousLogMels.removeAll(keepingCapacity: true)
    previousRmsDb = -120.0
    scoreHistory.removeAll(keepingCapacity: true)
    rmsHistory.removeAll(keepingCapacity: true)
    pendingAttack = nil
    lastAttackTimeMs = -1_000_000_000
    isActive = false
    activePeakDb = -120.0
    belowReleaseCount = 0
    latestNoiseDb = -90.0
    latestFrameTimeMs = 0
  }

  func process(samples inputSamples: [Float]) -> [PianoDetectionEvent] {
    guard !inputSamples.isEmpty else {
      return []
    }

    sampleBuffer.append(contentsOf: inputSamples)
    var events: [PianoDetectionEvent] = []

    while sampleBuffer.count >= frameLength {
      let frame = Array(sampleBuffer[0..<frameLength])
      events.append(contentsOf: processFrame(frame, frameStartSample: frameStartSample))
      sampleBuffer.removeFirst(min(hopLength, sampleBuffer.count))
      frameStartSample += Int64(hopLength)
    }

    return events
  }

  private func processFrame(_ frame: [Float], frameStartSample: Int64) -> [PianoDetectionEvent] {
    var events: [PianoDetectionEvent] = []
    let timeMs = Int64((Double(frameStartSample) / Double(config.sampleRate)) * 1000.0)
    latestFrameTimeMs = timeMs
    let emittedAtMs = Int64(
      (Double(frameStartSample + Int64(frameLength)) / Double(config.sampleRate)) * 1000.0
    )

    let features = computeFrameFeatures(frame)
    let rmsDb = features.rmsDb
    let score = features.score
    let logMel = features.logMel
    let scoreStats = rollingScoreStats()
    let medianScore = scoreStats.median
    let scoreScale = scoreStats.scale
    let threshold = max(config.absScoreFloor, medianScore + config.thresholdK * scoreScale)
    let noiseDb = rollingNoiseDb()
    latestNoiseDb = noiseDb

    let enoughWarmup = scoreHistory.count >= warmupFrames
    let absoluteFloorOk = rmsDb >= config.absoluteFloorDb
    let snrOk = rmsDb > noiseDb + config.minSnrDb
    let cooldownOk = Float(timeMs - lastAttackTimeMs) >= config.minAttackIntervalMs
    let candidate = enoughWarmup && absoluteFloorOk && snrOk && cooldownOk && score > threshold

    if candidate {
      let pendingScore = pendingAttack?.score ?? 0.0
      if pendingAttack == nil || score > pendingScore {
        pendingAttack = PendingAttack(
          timeMs: timeMs,
          score: score,
          threshold: threshold,
          rmsDb: rmsDb,
          noiseDb: noiseDb,
          ageFrames: 0
        )
      }
    }

    if var pending = pendingAttack {
      pending.ageFrames += 1

      if rmsDb < config.absoluteFloorDb || rmsDb < pending.noiseDb + config.minSnrDb - 3.0 {
        pendingAttack = nil
      } else if pending.ageFrames >= confirmFrames {
        events.append(
          PianoDetectionEvent(
            timeMs: pending.timeMs,
            emittedAtMs: emittedAtMs,
            dB: pending.rmsDb,
            score: pending.score,
            type: .attack,
            threshold: pending.threshold,
            noiseDb: pending.noiseDb
          )
        )
        lastAttackTimeMs = pending.timeMs
        isActive = true
        activePeakDb = max(activePeakDb, rmsDb, pending.rmsDb)
        pendingAttack = nil
      } else {
        pendingAttack = pending
      }
    }

    if isActive {
      activePeakDb = max(activePeakDb, rmsDb)
      let releaseFloor = noiseDb + config.releaseSnrDb
      let scoreIsQuiet = score < medianScore + 1.5 * scoreScale
      let activePeakWasAboveFloor = activePeakDb >= config.absoluteFloorDb
      let belowRelease = scoreIsQuiet
        && (
          rmsDb < releaseFloor
            || (
              rmsDb < activePeakDb - config.releaseDropDb
                && rmsDb < noiseDb + config.minSnrDb
            )
        )

      if belowRelease {
        belowReleaseCount += 1

        if belowReleaseCount >= releaseHoldFrames {
          if !activePeakWasAboveFloor {
            isActive = false
            activePeakDb = -120.0
            belowReleaseCount = 0
          } else {
            events.append(
              PianoDetectionEvent(
                timeMs: timeMs,
                emittedAtMs: emittedAtMs,
                dB: rmsDb,
                score: score,
                type: .release,
                threshold: threshold,
                noiseDb: noiseDb
              )
            )
            isActive = false
            activePeakDb = -120.0
            belowReleaseCount = 0
          }
        }
      } else {
        belowReleaseCount = 0
      }
    }

    if !candidate {
      appendRolling(&scoreHistory, score, maxCount: maxScoreHistoryCount)
    }

    appendRolling(&rmsHistory, rmsDb, maxCount: maxRmsHistoryCount)
    previousLogMels.append(logMel)
    appendRollingLogMels(maxCount: config.lag)
    previousRmsDb = rmsDb

    return events
  }

  private func computeFrameFeatures(_ frame: [Float]) -> (rmsDb: Float, score: Float, logMel: [Float]) {
    let rms = sqrt(frame.reduce(Float(0)) { $0 + $1 * $1 } / Float(max(frame.count, 1)))
    let rmsDb = ampToDb(max(rms, 1e-12))
    let power = powerSpectrum(frame)
    var logMel = [Float](repeating: 0, count: config.nMels)

    for melIndex in 0..<config.nMels {
      var melPower: Float = 0
      let filter = melFilterbank[melIndex]

      for binIndex in 0..<filter.count {
        melPower += filter[binIndex] * power[binIndex]
      }

      logMel[melIndex] = log1pf(1000.0 * max(melPower, 1e-12))
    }

    guard previousLogMels.count >= config.lag, let laggedLogMel = previousLogMels.first else {
      return (rmsDb, 0.0, logMel)
    }

    let reference = maxFilter(laggedLogMel, size: config.maxFilterSize)
    var positiveDiff = [Float](repeating: 0, count: config.nMels)

    for index in 0..<config.nMels {
      positiveDiff[index] = max(0.0, logMel[index] - reference[index])
    }

    let melFlux = mean(positiveDiff)
    var highFrequencyFluxSum: Float = 0
    for index in 0..<config.nMels {
      highFrequencyFluxSum += positiveDiff[index] * highFrequencyWeights[index]
    }
    let highFrequencyFlux = highFrequencyFluxSum / Float(max(config.nMels, 1))
    let rmsRise = max(0.0, rmsDb - previousRmsDb)
    let score = melFlux + 0.35 * highFrequencyFlux + 0.04 * rmsRise

    return (rmsDb, score, logMel)
  }

  private func powerSpectrum(_ frame: [Float]) -> [Float] {
    guard let fftSetup else {
      return [Float](repeating: 0, count: nFFT / 2 + 1)
    }

    var input = [Float](repeating: 0, count: nFFT)
    for index in 0..<frameLength {
      input[index] = frame[index] * window[index]
    }

    var real = [Float](repeating: 0, count: nFFT / 2)
    var imag = [Float](repeating: 0, count: nFFT / 2)
    var power = [Float](repeating: 0, count: nFFT / 2 + 1)

    real.withUnsafeMutableBufferPointer { realPointer in
      imag.withUnsafeMutableBufferPointer { imagPointer in
        var split = DSPSplitComplex(realp: realPointer.baseAddress!, imagp: imagPointer.baseAddress!)

        input.withUnsafeBufferPointer { inputPointer in
          inputPointer.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: nFFT / 2) { complexPointer in
            vDSP_ctoz(complexPointer, 2, &split, 1, vDSP_Length(nFFT / 2))
          }
        }

        vDSP_fft_zrip(fftSetup, &split, 1, log2n, FFTDirection(FFT_FORWARD))

        var magnitudes = [Float](repeating: 0, count: nFFT / 2)
        vDSP_zvmags(&split, 1, &magnitudes, 1, vDSP_Length(nFFT / 2))

        power[0] = realPointer[0] * realPointer[0]
        power[nFFT / 2] = imagPointer[0] * imagPointer[0]

        if nFFT / 2 > 1 {
          for binIndex in 1..<(nFFT / 2) {
            power[binIndex] = magnitudes[binIndex]
          }
        }
      }
    }

    return power
  }

  private func rollingScoreStats() -> (median: Float, scale: Float) {
    guard !scoreHistory.isEmpty else {
      return (0.0, 1.0)
    }

    let medianScore = median(scoreHistory)
    let deviations = scoreHistory.map { abs($0 - medianScore) }
    let mad = median(deviations)
    var scale = 1.4826 * mad + 1e-6

    if scale < 0.005 {
      scale = max(std(scoreHistory), 0.005)
    }

    return (medianScore, scale)
  }

  private func rollingNoiseDb() -> Float {
    guard !rmsHistory.isEmpty else {
      return -90.0
    }
    return percentile(rmsHistory, p: 0.20)
  }

  private func appendRolling(_ array: inout [Float], _ value: Float, maxCount: Int) {
    array.append(value)
    if array.count > maxCount {
      array.removeFirst(array.count - maxCount)
    }
  }

  private func appendRollingLogMels(maxCount: Int) {
    if previousLogMels.count > maxCount {
      previousLogMels.removeFirst(previousLogMels.count - maxCount)
    }
  }

  private func ampToDb(_ value: Float) -> Float {
    20.0 * log10f(max(value, 1e-12))
  }

  private func maxFilter(_ values: [Float], size: Int) -> [Float] {
    guard values.count >= 2, size > 1 else {
      return values
    }

    let radius = max(1, size / 2)
    var filtered = values

    for index in 0..<values.count {
      let start = max(0, index - radius)
      let end = min(values.count - 1, index + radius)
      var maxValue = values[index]

      for filterIndex in start...end {
        maxValue = max(maxValue, values[filterIndex])
      }

      filtered[index] = maxValue
    }

    return filtered
  }

  private func mean(_ values: [Float]) -> Float {
    guard !values.isEmpty else {
      return 0
    }
    return values.reduce(0, +) / Float(values.count)
  }

  private func median(_ values: [Float]) -> Float {
    guard !values.isEmpty else {
      return 0
    }

    let sorted = values.sorted()
    let mid = sorted.count / 2

    if sorted.count.isMultiple(of: 2) {
      return 0.5 * (sorted[mid - 1] + sorted[mid])
    }
    return sorted[mid]
  }

  private func percentile(_ values: [Float], p: Float) -> Float {
    guard !values.isEmpty else {
      return 0
    }

    let sorted = values.sorted()
    let clampedP = min(max(p, 0), 1)
    let index = Int(round(clampedP * Float(sorted.count - 1)))
    return sorted[index]
  }

  private func std(_ values: [Float]) -> Float {
    guard !values.isEmpty else {
      return 0
    }

    let average = mean(values)
    let variance = values.reduce(Float(0)) { $0 + ($1 - average) * ($1 - average) } / Float(values.count)
    return sqrt(variance)
  }

  private static func nextPowerOfTwo(_ value: Int) -> Int {
    var power = 1
    while power < value {
      power <<= 1
    }
    return power
  }

  private static func hannWindow(count: Int) -> [Float] {
    var window = [Float](repeating: 0, count: count)
    vDSP_hann_window(&window, vDSP_Length(count), Int32(vDSP_HANN_NORM))
    return window
  }

  private static func hzToMel(_ hz: Float) -> Float {
    2595.0 * log10f(1.0 + hz / 700.0)
  }

  private static func melToHz(_ mel: Float) -> Float {
    700.0 * (powf(10.0, mel / 2595.0) - 1.0)
  }

  private static func melCenterFrequencies(nMels: Int, fMin: Float, fMax: Float) -> [Float] {
    let minMel = hzToMel(fMin)
    let maxMel = hzToMel(fMax)

    return (0..<nMels).map { index in
      let ratio = Float(index + 1) / Float(nMels + 1)
      let mel = minMel + ratio * (maxMel - minMel)
      return melToHz(mel)
    }
  }

  private static func makeMelFilterbank(
    sampleRate: Float,
    nFFT: Int,
    nMels: Int,
    fMin: Float,
    fMax: Float
  ) -> [[Float]] {
    let nFreqs = nFFT / 2 + 1
    let minMel = hzToMel(fMin)
    let maxMel = hzToMel(fMax)
    let melPoints = (0..<(nMels + 2)).map { index in
      let ratio = Float(index) / Float(nMels + 1)
      return minMel + ratio * (maxMel - minMel)
    }
    let hzPoints = melPoints.map { melToHz($0) }
    let binFreqs = (0..<nFreqs).map { binIndex in
      Float(binIndex) * sampleRate / Float(nFFT)
    }
    var filters = Array(repeating: Array(repeating: Float(0), count: nFreqs), count: nMels)

    for melIndex in 0..<nMels {
      let left = hzPoints[melIndex]
      let center = hzPoints[melIndex + 1]
      let right = hzPoints[melIndex + 2]

      for binIndex in 0..<nFreqs {
        let frequency = binFreqs[binIndex]

        if frequency >= left && frequency <= center {
          filters[melIndex][binIndex] = (frequency - left) / max(center - left, 1e-6)
        } else if frequency > center && frequency <= right {
          filters[melIndex][binIndex] = (right - frequency) / max(right - center, 1e-6)
        }
      }
    }

    return filters
  }
}

private final class PianoAttackDetectorService: @unchecked Sendable {
  private let audioEngine = AVAudioEngine()
  private let queue = DispatchQueue(label: "com.musebuddy.piano-attack-detector")
  private let bufferSize: AVAudioFrameCount = 1024
  private let audioFileName = "piano-attack-recording.wav"
  private let logFileName = "piano-attack-events.jsonl"
  private var detector: RealtimePianoAttackDetector?
  private var listening = false
  private var lastAmbientLevelDb: Int?
  private var nextEventId = 0
  private var recordedSamples: [Float] = []
  private var recordingSampleRate: Float = 44_100
  private var audioFileURL: URL {
    artifactDirectoryURL.appendingPathComponent(audioFileName)
  }
  private var logFileURL: URL {
    artifactDirectoryURL.appendingPathComponent(logFileName)
  }
  private var artifactDirectoryURL: URL {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("PianoAttackDetector", isDirectory: true)
  }

  var onAttack: (([String: Any]) -> Void)?
  var onRelease: (([String: Any]) -> Void)?
  var onAmbientLevelChange: (([String: Any]) -> Void)?

  var isListening: Bool {
    queue.sync {
      listening
    }
  }

  func startListening(options: [String: Double]) async throws {
    guard await requestMicrophonePermission() else {
      throw PianoAttackDetectorError.microphonePermissionDenied
    }

    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      queue.async {
        do {
          try self.startListeningOnQueue(options: options)
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

  func artifactFiles() -> [String: String] {
    queue.sync {
      [
        "audioUri": audioFileURL.absoluteString,
        "logUri": logFileURL.absoluteString,
      ]
    }
  }

  func shareArtifact(kind: String) async throws {
    let fileURL = try queue.sync {
      switch kind {
      case "audio":
        return audioFileURL
      case "log":
        return logFileURL
      default:
        throw PianoAttackDetectorError.artifactUnavailable("Unknown artifact kind: \(kind)")
      }
    }

    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      throw PianoAttackDetectorError.artifactUnavailable("No \(kind) file has been written yet.")
    }

    try await MainActor.run {
      guard let presenter = Self.topViewController() else {
        throw PianoAttackDetectorError.shareFailed("No active view controller is available.")
      }

      let activity = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
      if let popover = activity.popoverPresentationController {
        popover.sourceView = presenter.view
        popover.sourceRect = CGRect(
          x: presenter.view.bounds.midX,
          y: presenter.view.bounds.midY,
          width: 1,
          height: 1
        )
      }
      presenter.present(activity, animated: true)
    }
  }

  private func startListeningOnQueue(options: [String: Double]) throws {
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
    try prepareArtifactFiles()
    recordingSampleRate = Float(format.sampleRate)
    detector = RealtimePianoAttackDetector(
      config: PianoAttackConfiguration(sampleRate: Float(format.sampleRate), options: options)
    )

    inputNode.removeTap(onBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] buffer, _ in
      guard let samples = buffer.monoFloatArray() else {
        return
      }
      self?.process(samples: samples)
    }

    do {
      audioEngine.prepare()
      try audioEngine.start()
      listening = true
    } catch {
      inputNode.removeTap(onBus: 0)
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
      detector = nil
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
    writeRecordingFile()
    detector?.reset()
    resetDetectionState()
  }

  private func resetDetectionState() {
    lastAmbientLevelDb = nil
    nextEventId = 0
    detector = nil
    recordedSamples.removeAll(keepingCapacity: true)
  }

  private func process(samples: [Float]) {
    queue.async {
      guard self.listening, let detector = self.detector else {
        return
      }

      self.recordedSamples.append(contentsOf: samples)
      let events = detector.process(samples: samples)
      self.emitAmbientLevelChangeIfNeeded(
        levelDb: Double(detector.noiseDb),
        timestampMs: Double(detector.currentTimeMs)
      )

      for event in events {
        self.nextEventId += 1
        let payload = self.payload(for: event, id: self.nextEventId)
        self.appendLogLine(payload)

        DispatchQueue.main.async { [weak self] in
          switch event.type {
          case .attack:
            self?.onAttack?(payload)
          case .release:
            self?.onRelease?(payload)
          }
        }
      }
    }
  }

  private func payload(for event: PianoDetectionEvent, id: Int) -> [String: Any] {
    let levelDb = Double(event.dB)
    let ambientDb = Double(event.noiseDb)

    return [
      "id": id,
      "type": event.type.rawValue,
      "timestampMs": Double(event.timeMs),
      "timeMs": Double(event.timeMs),
      "emittedAtMs": Double(event.emittedAtMs),
      "levelDb": levelDb,
      "dB": levelDb,
      "ambientDb": ambientDb,
      "noiseDb": ambientDb,
      "deltaDb": levelDb - ambientDb,
      "onsetStrengthDb": Double(event.score),
      "score": Double(event.score),
      "threshold": Double(event.threshold),
    ]
  }

  private func emitAmbientLevelChangeIfNeeded(levelDb: Double, timestampMs: Double) {
    let roundedLevelDb = Int(levelDb.rounded())
    guard roundedLevelDb != lastAmbientLevelDb else {
      return
    }

    lastAmbientLevelDb = roundedLevelDb
    let payload: [String: Any] = [
      "type": "ambient",
      "levelDb": levelDb,
      "roundedLevelDb": roundedLevelDb,
      "timestampMs": timestampMs,
    ]
    appendLogLine(payload)

    DispatchQueue.main.async { [weak self] in
      self?.onAmbientLevelChange?(payload)
    }
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

  private func prepareArtifactFiles() throws {
    do {
      try FileManager.default.createDirectory(
        at: artifactDirectoryURL,
        withIntermediateDirectories: true
      )
      if FileManager.default.fileExists(atPath: audioFileURL.path) {
        try FileManager.default.removeItem(at: audioFileURL)
      }
      if FileManager.default.fileExists(atPath: logFileURL.path) {
        try FileManager.default.removeItem(at: logFileURL)
      }
      FileManager.default.createFile(atPath: logFileURL.path, contents: nil)
    } catch {
      throw PianoAttackDetectorError.audioStartFailed("Could not prepare artifact files: \(error.localizedDescription)")
    }
  }

  private func appendLogLine(_ payload: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(payload),
      let data = try? JSONSerialization.data(withJSONObject: payload),
      let handle = try? FileHandle(forWritingTo: logFileURL)
    else {
      return
    }

    handle.seekToEndOfFile()
    handle.write(data)
    handle.write(Data("\n".utf8))
    try? handle.close()
  }

  private func writeRecordingFile() {
    guard !recordedSamples.isEmpty else {
      FileManager.default.createFile(atPath: audioFileURL.path, contents: nil)
      return
    }

    let header = wavHeader(
      sampleCount: recordedSamples.count,
      sampleRate: Int(recordingSampleRate.rounded())
    )
    var data = Data()
    data.append(header)

    for sample in recordedSamples {
      let clamped = min(max(sample, -1.0), 1.0)
      let scaled = Int16(clamped * Float(Int16.max))
      var littleEndianSample = scaled.littleEndian
      withUnsafeBytes(of: &littleEndianSample) { bytes in
        data.append(contentsOf: bytes)
      }
    }

    try? data.write(to: audioFileURL, options: .atomic)
  }

  private func wavHeader(sampleCount: Int, sampleRate: Int) -> Data {
    let channelCount = 1
    let bitsPerSample = 16
    let bytesPerSample = bitsPerSample / 8
    let byteRate = sampleRate * channelCount * bytesPerSample
    let blockAlign = channelCount * bytesPerSample
    let dataSize = sampleCount * bytesPerSample
    let riffSize = 36 + dataSize
    var data = Data()

    func appendString(_ value: String) {
      data.append(Data(value.utf8))
    }

    func appendUInt16(_ value: UInt16) {
      var littleEndianValue = value.littleEndian
      withUnsafeBytes(of: &littleEndianValue) { data.append(contentsOf: $0) }
    }

    func appendUInt32(_ value: UInt32) {
      var littleEndianValue = value.littleEndian
      withUnsafeBytes(of: &littleEndianValue) { data.append(contentsOf: $0) }
    }

    appendString("RIFF")
    appendUInt32(UInt32(riffSize))
    appendString("WAVE")
    appendString("fmt ")
    appendUInt32(16)
    appendUInt16(1)
    appendUInt16(UInt16(channelCount))
    appendUInt32(UInt32(sampleRate))
    appendUInt32(UInt32(byteRate))
    appendUInt16(UInt16(blockAlign))
    appendUInt16(UInt16(bitsPerSample))
    appendString("data")
    appendUInt32(UInt32(dataSize))

    return data
  }

  @MainActor
  private static func topViewController(base: UIViewController? = nil) -> UIViewController? {
    let root = base ?? UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .first { $0.isKeyWindow }?
      .rootViewController

    guard let root else {
      return nil
    }

    if let navigation = root as? UINavigationController {
      return topViewController(base: navigation.visibleViewController)
    }

    if let tab = root as? UITabBarController {
      return topViewController(base: tab.selectedViewController)
    }

    if let presented = root.presentedViewController {
      return topViewController(base: presented)
    }

    return root
  }
}

private extension AVAudioPCMBuffer {
  func monoFloatArray() -> [Float]? {
    let frameCount = Int(frameLength)
    let channelCount = Int(format.channelCount)
    guard frameCount > 0, channelCount > 0, let floatChannelData else {
      return nil
    }

    if channelCount == 1 {
      let pointer = floatChannelData[0]
      return Array(UnsafeBufferPointer(start: pointer, count: frameCount))
    }

    var mono = [Float](repeating: 0, count: frameCount)
    for channel in 0..<channelCount {
      let pointer = floatChannelData[channel]
      for frame in 0..<frameCount {
        mono[frame] += pointer[frame]
      }
    }

    let scale = Float(1.0 / Double(channelCount))
    for frame in 0..<frameCount {
      mono[frame] *= scale
    }

    return mono
  }
}

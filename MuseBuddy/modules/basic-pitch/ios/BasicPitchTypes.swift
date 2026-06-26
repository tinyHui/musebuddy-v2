import ExpoModulesCore

enum BasicPitchError: Error {
  case modelResourceMissing
  case modelLoadFailed(String)
  case modelValidationFailed(String)
  case microphonePermissionDenied
  case recordingAlreadyActive
  case recordingNotActive
  case audioSessionInterrupted
  case audioConversionFailed(String)
  case inferenceFailed(String)
  case transcriptionAlreadyRunning

  var code: String {
    switch self {
    case .modelResourceMissing:
      "ERR_MODEL_RESOURCE_MISSING"
    case .modelLoadFailed:
      "ERR_MODEL_LOAD_FAILED"
    case .modelValidationFailed:
      "ERR_MODEL_VALIDATION_FAILED"
    case .microphonePermissionDenied:
      "ERR_MICROPHONE_PERMISSION_DENIED"
    case .recordingAlreadyActive:
      "ERR_RECORDING_ALREADY_ACTIVE"
    case .recordingNotActive:
      "ERR_RECORDING_NOT_ACTIVE"
    case .audioSessionInterrupted:
      "ERR_AUDIO_SESSION_INTERRUPTED"
    case .audioConversionFailed:
      "ERR_AUDIO_CONVERSION_FAILED"
    case .inferenceFailed:
      "ERR_INFERENCE_FAILED"
    case .transcriptionAlreadyRunning:
      "ERR_TRANSCRIPTION_ALREADY_RUNNING"
    }
  }

  var message: String {
    switch self {
    case .modelResourceMissing:
      "The bundled Basic Pitch model could not be found."
    case let .modelLoadFailed(detail):
      "The Basic Pitch model could not be loaded: \(detail)"
    case let .modelValidationFailed(detail):
      "The Basic Pitch model has an unexpected interface: \(detail)"
    case .microphonePermissionDenied:
      "Microphone permission was denied."
    case .recordingAlreadyActive:
      "A recording is already active."
    case .recordingNotActive:
      "No recording is active."
    case .audioSessionInterrupted:
      "The audio session was interrupted."
    case let .audioConversionFailed(detail):
      "Audio conversion failed: \(detail)"
    case let .inferenceFailed(detail):
      "Basic Pitch inference failed: \(detail)"
    case .transcriptionAlreadyRunning:
      "A transcription is already running."
    }
  }
}

final class BasicPitchException: Exception, @unchecked Sendable {
  private let error: BasicPitchError

  init(_ error: BasicPitchError) {
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

struct TranscriptionNoteRecord: Record {
  @Field var midiPitch: Int = 0
  @Field var startTimeMs: Double = 0
  @Field var endTimeMs: Double = 0
  @Field var durationMs: Double = 0
  @Field var confidence: Double = 0
  @Field var velocity: Int = 0
}

struct TranscriptionResultRecord: Record {
  @Field var recordingDurationMs: Double = 0
  @Field var processingDurationMs: Double = 0
  @Field var notes: [TranscriptionNoteRecord] = []
}

struct RecordingArtifactRecord: Record {
  @Field var uri: String = ""
  @Field var durationMs: Double = 0
}

struct DecodedNote {
  let startFrame: Int
  let endFrame: Int
  let midiPitch: Int
  let confidence: Float
}

struct ModelOutputs {
  let frameCount: Int
  let notes: [Float]
  let onsets: [Float]
}

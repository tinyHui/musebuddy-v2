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
      return "ERR_MODEL_RESOURCE_MISSING"
    case .modelLoadFailed:
      return "ERR_MODEL_LOAD_FAILED"
    case .modelValidationFailed:
      return "ERR_MODEL_VALIDATION_FAILED"
    case .microphonePermissionDenied:
      return "ERR_MICROPHONE_PERMISSION_DENIED"
    case .recordingAlreadyActive:
      return "ERR_RECORDING_ALREADY_ACTIVE"
    case .recordingNotActive:
      return "ERR_RECORDING_NOT_ACTIVE"
    case .audioSessionInterrupted:
      return "ERR_AUDIO_SESSION_INTERRUPTED"
    case .audioConversionFailed:
      return "ERR_AUDIO_CONVERSION_FAILED"
    case .inferenceFailed:
      return "ERR_INFERENCE_FAILED"
    case .transcriptionAlreadyRunning:
      return "ERR_TRANSCRIPTION_ALREADY_RUNNING"
    }
  }

  var message: String {
    switch self {
    case .modelResourceMissing:
      return "The bundled Basic Pitch model could not be found."
    case .modelLoadFailed(let detail):
      return "The Basic Pitch model could not be loaded: \(detail)"
    case .modelValidationFailed(let detail):
      return "The Basic Pitch model has an unexpected interface: \(detail)"
    case .microphonePermissionDenied:
      return "Microphone permission was denied."
    case .recordingAlreadyActive:
      return "A recording is already active."
    case .recordingNotActive:
      return "No recording is active."
    case .audioSessionInterrupted:
      return "The audio session was interrupted."
    case .audioConversionFailed(let detail):
      return "Audio conversion failed: \(detail)"
    case .inferenceFailed(let detail):
      return "Basic Pitch inference failed: \(detail)"
    case .transcriptionAlreadyRunning:
      return "A transcription is already running."
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

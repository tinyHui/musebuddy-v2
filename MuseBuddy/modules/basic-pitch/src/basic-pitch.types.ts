export type TranscriptionNote = {
  midiPitch: number;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  confidence: number;
  velocity: number;
};

export type TranscriptionResult = {
  recordingDurationMs: number;
  processingDurationMs: number;
  notes: TranscriptionNote[];
};

export type RecordingArtifact = {
  uri: string;
  durationMs: number;
};

export type RecordingProgress = {
  elapsedMs: number;
  level: number;
};

export type BasicPitchErrorCode =
  | 'ERR_MODEL_RESOURCE_MISSING'
  | 'ERR_MODEL_LOAD_FAILED'
  | 'ERR_MODEL_VALIDATION_FAILED'
  | 'ERR_MICROPHONE_PERMISSION_DENIED'
  | 'ERR_RECORDING_ALREADY_ACTIVE'
  | 'ERR_RECORDING_NOT_ACTIVE'
  | 'ERR_AUDIO_SESSION_INTERRUPTED'
  | 'ERR_AUDIO_CONVERSION_FAILED'
  | 'ERR_INFERENCE_FAILED'
  | 'ERR_TRANSCRIPTION_ALREADY_RUNNING'
  | 'ERR_UNSUPPORTED_PLATFORM';

import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

import type {
  BasicPitchErrorCode,
  RecordingArtifact,
  RecordingProgress,
  TranscriptionResult,
} from './basic-pitch.types';

export type {
  BasicPitchErrorCode,
  RecordingArtifact,
  RecordingProgress,
  TranscriptionNote,
  TranscriptionResult,
} from './basic-pitch.types';

type EventSubscription = {
  remove(): void;
};

type BasicPitchEvents = {
  onRecordingProgress(progress: RecordingProgress): void;
  onRecordingFinished(recording: RecordingArtifact): void;
};

type NativeBasicPitchModule = {
  initialize(): Promise<void>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<RecordingArtifact>;
  transcribeRecording(): Promise<TranscriptionResult>;
  cancelRecording(): Promise<void>;
  addListener<EventName extends keyof BasicPitchEvents>(
    eventName: EventName,
    listener: BasicPitchEvents[EventName],
  ): EventSubscription;
};

type NativeError = Error & {
  code?: string;
};

export class BasicPitchError extends Error {
  constructor(
    public readonly code: BasicPitchErrorCode,
    message: string,
    public readonly nativeMessage?: string,
  ) {
    super(message);
    this.name = 'BasicPitchError';
  }
}

const errorMessages: Record<BasicPitchErrorCode, string> = {
  ERR_MODEL_RESOURCE_MISSING:
    'The bundled transcription model is missing. Rebuild the development client.',
  ERR_MODEL_LOAD_FAILED: 'The transcription model could not be loaded.',
  ERR_MODEL_VALIDATION_FAILED: 'The bundled transcription model is incompatible.',
  ERR_MICROPHONE_PERMISSION_DENIED:
    'Microphone access is required. Enable it for MuseBuddy in Settings.',
  ERR_RECORDING_ALREADY_ACTIVE: 'A recording is already in progress.',
  ERR_RECORDING_NOT_ACTIVE: 'There is no active recording to finish.',
  ERR_AUDIO_SESSION_INTERRUPTED: 'Recording was interrupted. Please start again.',
  ERR_AUDIO_CONVERSION_FAILED: 'The recording could not be prepared for transcription.',
  ERR_INFERENCE_FAILED: 'The recording could not be transcribed.',
  ERR_TRANSCRIPTION_ALREADY_RUNNING: 'A transcription is already in progress.',
  ERR_UNSUPPORTED_PLATFORM:
    'On-device transcription is available only in the MuseBuddy iOS development client.',
};

let nativeModule: NativeBasicPitchModule | null = null;

function getNativeModule(): NativeBasicPitchModule {
  if (Platform.OS !== 'ios') {
    throw new BasicPitchError('ERR_UNSUPPORTED_PLATFORM', errorMessages.ERR_UNSUPPORTED_PLATFORM);
  }

  nativeModule ??= requireNativeModule<NativeBasicPitchModule>('BasicPitch');
  return nativeModule;
}

function mapError(error: unknown): BasicPitchError {
  if (error instanceof BasicPitchError) {
    return error;
  }

  const code = (error as NativeError | undefined)?.code as BasicPitchErrorCode | undefined;
  const nativeMessage = error instanceof Error ? error.message : String(error);
  if (code && code in errorMessages) {
    return new BasicPitchError(code, errorMessages[code], nativeMessage);
  }

  return new BasicPitchError(
    'ERR_INFERENCE_FAILED',
    errorMessages.ERR_INFERENCE_FAILED,
    nativeMessage,
  );
}

async function callNative<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapError(error);
  }
}

export function initialize(): Promise<void> {
  return callNative(() => getNativeModule().initialize());
}

export function startRecording(): Promise<void> {
  return callNative(() => getNativeModule().startRecording());
}

export function stopRecording(): Promise<RecordingArtifact> {
  return callNative(() => getNativeModule().stopRecording());
}

export function transcribeRecording(): Promise<TranscriptionResult> {
  return callNative(() => getNativeModule().transcribeRecording());
}

export function cancelRecording(): Promise<void> {
  return callNative(() => getNativeModule().cancelRecording());
}

export function addRecordingProgressListener(
  listener: (progress: RecordingProgress) => void,
): EventSubscription {
  return getNativeModule().addListener('onRecordingProgress', listener);
}

export function addRecordingFinishedListener(
  listener: (recording: RecordingArtifact) => void,
): EventSubscription {
  return getNativeModule().addListener('onRecordingFinished', listener);
}

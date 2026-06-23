import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';

import {
  addRecordingFinishedListener,
  addRecordingProgressListener,
  BasicPitchError,
  initialize,
  startRecording,
  stopRecording,
  transcribeRecording,
  type RecordingArtifact,
  type RecordingProgress,
  type TranscriptionResult,
} from '../../modules/basic-pitch';

export type TranscriptionPhase =
  | 'loadingModel'
  | 'modelError'
  | 'ready'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'recorded'
  | 'transcribing'
  | 'results';

const initialProgress: RecordingProgress = {
  elapsedMs: 0,
  level: 0,
};

function messageFor(error: unknown, fallback: string): string {
  return error instanceof BasicPitchError ? error.message : fallback;
}

function logError(context: string, error: unknown): void {
  if (error instanceof BasicPitchError) {
    console.error(context, {
      code: error.code,
      message: error.message,
      nativeMessage: error.nativeMessage,
      error,
    });
    return;
  }
  console.error(context, error);
}

export function useTranscription() {
  const [phase, setPhase] = useState<TranscriptionPhase>('loadingModel');
  const [progress, setProgress] = useState<RecordingProgress>(initialProgress);
  const [recording, setRecording] = useState<RecordingArtifact | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const loadModel = useCallback(async () => {
    setPhase('loadingModel');
    setStatusMessage('');
    try {
      await initialize();
      setPhase('ready');
    } catch (error) {
      logError('Basic Pitch model initialization failed.', error);
      setStatusMessage(messageFor(error, 'The transcription model could not be initialized.'));
      setPhase('modelError');
    } finally {
      await SplashScreen.hideAsync();
    }
  }, []);

  useEffect(() => {
    void initialize()
      .then(() => {
        setPhase('ready');
      })
      .catch((error: unknown) => {
        logError('Basic Pitch model initialization failed.', error);
        setStatusMessage(messageFor(error, 'The transcription model could not be initialized.'));
        setPhase('modelError');
      })
      .finally(() => SplashScreen.hideAsync());
  }, []);

  useEffect(() => {
    let progressSubscription: ReturnType<typeof addRecordingProgressListener> | undefined;
    let finishedSubscription: ReturnType<typeof addRecordingFinishedListener> | undefined;

    try {
      progressSubscription = addRecordingProgressListener(setProgress);
      finishedSubscription = addRecordingFinishedListener((artifact) => {
        setRecording(artifact);
        setProgress((current) => ({ ...current, elapsedMs: artifact.durationMs }));
        setPhase('recorded');
      });
    } catch {
      // Model initialization reports unsupported or unavailable native modules.
    }

    return () => {
      progressSubscription?.remove();
      finishedSubscription?.remove();
    };
  }, []);

  const start = useCallback(async () => {
    setStatusMessage('');
    setPhase('starting');
    try {
      await startRecording();
      setProgress(initialProgress);
      setRecording(null);
      setResult(null);
      setPhase('recording');
    } catch (error) {
      logError('Basic Pitch recording failed to start.', error);
      setStatusMessage(messageFor(error, 'Recording could not start.'));
      setPhase(recording ? 'recorded' : 'ready');
    }
  }, [recording]);

  const stop = useCallback(async () => {
    setStatusMessage('');
    setPhase('stopping');
    try {
      const artifact = await stopRecording();
      setRecording(artifact);
      setProgress((current) => ({ ...current, elapsedMs: artifact.durationMs }));
      setPhase('recorded');
    } catch (error) {
      logError('Basic Pitch recording failed to stop.', error);
      setStatusMessage(messageFor(error, 'Recording could not be stopped.'));
      setRecording(null);
      setPhase('ready');
    }
  }, []);

  const transcribe = useCallback(async () => {
    if (!recording) {
      return;
    }

    setStatusMessage('');
    setPhase('transcribing');
    try {
      const transcription = await transcribeRecording();
      setResult(transcription);
      setPhase('results');
    } catch (error) {
      logError('Basic Pitch transcription failed.', error);
      setPhase('recorded');
    }
  }, [recording]);

  return {
    loadModel,
    phase,
    progress,
    recording,
    result,
    start,
    statusMessage,
    stop,
    transcribe,
  };
}

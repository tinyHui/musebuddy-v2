import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addAmbientLevelChangeListener,
  addAttackListener,
  PianoAttackDetectorError,
  startListening,
  stopListening,
  type PianoAmbientLevelChangeEvent,
  type PianoAttackEvent,
} from '../../modules/piano-attack-detector';

type PianoAttackDetectorPhase = 'idle' | 'starting' | 'listening' | 'stopping' | 'error';

function messageFor(error: unknown): string {
  if (error instanceof PianoAttackDetectorError) {
    return error.message;
  }
  return 'Piano attack detection is unavailable.';
}

function logError(context: string, error: unknown): void {
  if (error instanceof PianoAttackDetectorError) {
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

export function usePianoAttackDetector() {
  const [phase, setPhase] = useState<PianoAttackDetectorPhase>('idle');
  const [ambientLevel, setAmbientLevel] = useState<PianoAmbientLevelChangeEvent | null>(null);
  const [lastAttack, setLastAttack] = useState<PianoAttackEvent | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const listeningRef = useRef(false);

  useEffect(() => {
    let ambientLevelSubscription: ReturnType<typeof addAmbientLevelChangeListener> | undefined;
    let attackSubscription: ReturnType<typeof addAttackListener> | undefined;

    try {
      ambientLevelSubscription = addAmbientLevelChangeListener(setAmbientLevel);
      attackSubscription = addAttackListener(setLastAttack);
    } catch {
      // Start reports unsupported or unavailable native modules.
    }

    return () => {
      ambientLevelSubscription?.remove();
      attackSubscription?.remove();
      if (listeningRef.current) {
        void stopListening().catch((error: unknown) => {
          logError('Piano attack detector cleanup failed.', error);
        });
      }
    };
  }, []);

  const start = useCallback(async () => {
    setPhase('starting');
    setStatusMessage('');
    try {
      await startListening();
      listeningRef.current = true;
      setPhase('listening');
    } catch (error) {
      logError('Piano attack detector failed to start.', error);
      listeningRef.current = false;
      setStatusMessage(messageFor(error));
      setPhase('error');
    }
  }, []);

  const stop = useCallback(async () => {
    setPhase('stopping');
    setStatusMessage('');
    try {
      await stopListening();
      listeningRef.current = false;
      setPhase('idle');
    } catch (error) {
      logError('Piano attack detector failed to stop.', error);
      setStatusMessage(messageFor(error));
      setPhase('error');
    }
  }, []);

  return {
    ambientLevel,
    lastAttack,
    phase,
    start,
    statusMessage,
    stop,
  };
}

import type {
  PianoAmbientLevelChangeEvent,
  PianoAttackDetectorErrorCode,
  PianoAttackEvent,
} from './PianoAttackDetector.types';

type EventSubscription = {
  remove(): void;
};

export type {
  PianoAmbientLevelChangeEvent,
  PianoAttackDetectorErrorCode,
  PianoAttackEvent,
  PianoAttackDetectorModuleEvents,
} from './PianoAttackDetector.types';

export class PianoAttackDetectorError extends Error {
  constructor(
    public readonly code: PianoAttackDetectorErrorCode,
    message: string,
    public readonly nativeMessage?: string,
  ) {
    super(message);
    this.name = 'PianoAttackDetectorError';
  }
}

function unsupported(): PianoAttackDetectorError {
  return new PianoAttackDetectorError(
    'ERR_UNSUPPORTED_PLATFORM',
    'Piano attack detection is available only in the MuseBuddy iOS development client.',
  );
}

export async function startListening(): Promise<void> {
  throw unsupported();
}

export async function stopListening(): Promise<void> {
  throw unsupported();
}

export function isListening(): boolean {
  return false;
}

export function addAttackListener(_listener: (event: PianoAttackEvent) => void): EventSubscription {
  return {
    remove() {},
  };
}

export function addAmbientLevelChangeListener(
  _listener: (event: PianoAmbientLevelChangeEvent) => void,
): EventSubscription {
  return {
    remove() {},
  };
}

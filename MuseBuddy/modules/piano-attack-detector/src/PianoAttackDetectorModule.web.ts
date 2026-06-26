import type {
  PianoAmbientLevelChangeEvent,
  PianoAttackDetectorArtifactFiles,
  PianoAttackDetectorArtifactKind,
  PianoAttackDetectorConfiguration,
  PianoAttackDetectorErrorCode,
  PianoAttackEvent,
} from './PianoAttackDetector.types';

type EventSubscription = {
  remove(): void;
};

export type {
  PianoAmbientLevelChangeEvent,
  PianoAttackDetectorArtifactFiles,
  PianoAttackDetectorArtifactKind,
  PianoAttackDetectorConfiguration,
  PianoAttackDetectorErrorCode,
  PianoAttackEvent,
  PianoAttackDetectorModuleEvents,
} from './PianoAttackDetector.types';

export const DEFAULT_PIANO_ATTACK_DETECTOR_CONFIGURATION: PianoAttackDetectorConfiguration = {
  frameMs: 32, // Analysis window size; larger is steadier, smaller reduces latency.
  hopMs: 10, // Detector update interval; smaller improves timing at higher CPU cost.
  nMels: 64, // Number of Mel bands; more bands add detail but can add sensitivity to noise.
  fMin: 30, // Lowest analyzed frequency; avoids spending bins on low rumble.
  fMax: 10_000, // Highest analyzed frequency; preserves hammer transients without excess hiss.
  lag: 1, // Frames to look back when comparing the current log-Mel frame.
  maxFilterSize: 3, // Local Mel-bin maximum filter width for SuperFlux-style suppression.
  warmupMs: 400, // Initial calibration time before attack events can emit.
  noiseWindowSec: 2, // Rolling RMS window used to estimate background noise.
  scoreWindowSec: 1.5, // Rolling onset-score window used for adaptive thresholding.
  thresholdK: 3.2, // Threshold strength; higher rejects more false positives.
  absScoreFloor: 0.07, // Minimum onset threshold so silence does not collapse the gate.
  absoluteFloorDb: -48, // Minimum frame RMS dB required before attack/release state changes are trusted.
  minSnrDb: 6, // Required RMS margin above the noise floor for attack candidates.
  confirmMs: 20, // Candidate survival time before emitting an attack.
  minAttackIntervalMs: 70, // Refractory period after each attack.
  releaseSnrDb: 5, // Release gate margin above the adaptive noise floor.
  releaseHoldMs: 120, // Quiet duration required before emitting a release.
  releaseDropDb: 24, // Large drop from active peak that can count toward release.
};

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

export async function startListening(
  _configuration: Partial<PianoAttackDetectorConfiguration> = {},
): Promise<void> {
  throw unsupported();
}

export async function stopListening(): Promise<void> {
  throw unsupported();
}

export function isListening(): boolean {
  return false;
}

export async function getArtifactFiles(): Promise<PianoAttackDetectorArtifactFiles> {
  throw unsupported();
}

export async function shareArtifact(_kind: PianoAttackDetectorArtifactKind): Promise<void> {
  throw unsupported();
}

export function addAttackListener(_listener: (event: PianoAttackEvent) => void): EventSubscription {
  return {
    remove() {},
  };
}

export function addReleaseListener(
  _listener: (event: PianoAttackEvent) => void,
): EventSubscription {
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

export type PianoAttackDetectorModuleEvents = {
  onAmbientLevelChange: (event: PianoAmbientLevelChangeEvent) => void;
  onAttack: (event: PianoAttackEvent) => void;
  onRelease: (event: PianoAttackEvent) => void;
};

export type PianoAttackDetectorArtifactKind = 'audio' | 'log';

export type PianoAttackDetectorArtifactFiles = {
  audioUri: string;
  logUri: string;
};

export type PianoAttackDetectorConfiguration = {
  /** Analysis window size; larger is spectrally steadier, smaller is lower latency. */
  frameMs: number;
  /** Detector update interval; smaller improves timing at higher CPU cost. */
  hopMs: number;
  /** Number of Mel bands; more bands add detail but can increase noise sensitivity. */
  nMels: number;
  /** Lowest analyzed frequency; raises rumble rejection below the piano range. */
  fMin: number;
  /** Highest analyzed frequency; keeps hammer transient content without excess hiss. */
  fMax: number;
  /** Number of frames to look back for spectral-flux comparison. */
  lag: number;
  /** Local Mel-bin maximum filter width used to suppress spectral wiggles. */
  maxFilterSize: number;
  /** Initial calibration time before attack events can emit. */
  warmupMs: number;
  /** Rolling RMS window length for adaptive background-noise estimation. */
  noiseWindowSec: number;
  /** Rolling onset-score window length for adaptive threshold estimation. */
  scoreWindowSec: number;
  /** Adaptive threshold multiplier; higher rejects more false positives. */
  thresholdK: number;
  /** Minimum onset threshold to prevent collapse in silence. */
  absScoreFloor: number;
  /** Minimum frame RMS dB required before attack/release state changes are trusted. */
  absoluteFloorDb: number;
  /** Required RMS margin above the noise floor before attack candidates pass. */
  minSnrDb: number;
  /** Time an attack candidate must persist before being emitted. */
  confirmMs: number;
  /** Refractory period after an attack to avoid double triggers. */
  minAttackIntervalMs: number;
  /** Release gate margin above the noise floor. */
  releaseSnrDb: number;
  /** Time signal must stay quiet before emitting a release. */
  releaseHoldMs: number;
  /** Large dB drop from active peak that can count toward release. */
  releaseDropDb: number;
};

export type PianoAmbientLevelChangeEvent = {
  levelDb: number;
  roundedLevelDb: number;
  timestampMs: number;
};

export type PianoAttackEvent = {
  id: number;
  type: 'attack' | 'release';
  timestampMs: number;
  timeMs: number;
  emittedAtMs: number;
  levelDb: number;
  dB: number;
  ambientDb: number;
  noiseDb: number;
  deltaDb: number;
  onsetStrengthDb: number;
  score: number;
  threshold: number;
};

export type PianoAttackDetectorErrorCode =
  | 'ERR_ATTACK_DETECTOR_ALREADY_LISTENING'
  | 'ERR_ATTACK_DETECTOR_ARTIFACT_UNAVAILABLE'
  | 'ERR_ATTACK_DETECTOR_AUDIO_START_FAILED'
  | 'ERR_ATTACK_DETECTOR_NOT_LISTENING'
  | 'ERR_ATTACK_DETECTOR_SHARE_FAILED'
  | 'ERR_MICROPHONE_PERMISSION_DENIED'
  | 'ERR_UNSUPPORTED_PLATFORM';

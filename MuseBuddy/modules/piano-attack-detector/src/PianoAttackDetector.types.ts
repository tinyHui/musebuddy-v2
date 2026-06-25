export type PianoAttackDetectorModuleEvents = {
  onAmbientLevelChange: (event: PianoAmbientLevelChangeEvent) => void;
  onAttack: (event: PianoAttackEvent) => void;
};

export type PianoAmbientLevelChangeEvent = {
  levelDb: number;
  roundedLevelDb: number;
  timestampMs: number;
};

export type PianoAttackEvent = {
  id: number;
  timestampMs: number;
  levelDb: number;
  ambientDb: number;
  deltaDb: number;
  onsetStrengthDb: number;
};

export type PianoAttackDetectorErrorCode =
  | 'ERR_ATTACK_DETECTOR_ALREADY_LISTENING'
  | 'ERR_ATTACK_DETECTOR_AUDIO_START_FAILED'
  | 'ERR_ATTACK_DETECTOR_NOT_LISTENING'
  | 'ERR_MICROPHONE_PERMISSION_DENIED'
  | 'ERR_UNSUPPORTED_PLATFORM';

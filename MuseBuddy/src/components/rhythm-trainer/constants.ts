export const BLOCK_COUNT = 4;
export const STEPS_PER_BLOCK = 8;
export const TOTAL_STEPS = BLOCK_COUNT * STEPS_PER_BLOCK;

export const DEFAULT_BPM = 120;
export const MIN_BPM = 60;
export const MAX_BPM = 200;
export const BPM_STEP = 5;

export const BLOCK_PATTERN_PROBABILITY_CONFIG = {
  blockStart: 0.92,
  downbeat: 0.72,
  offbeat: 0.28,
} as const;

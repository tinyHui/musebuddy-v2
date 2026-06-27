import { BLOCK_COUNT, BLOCK_PATTERN_PROBABILITY_CONFIG, STEPS_PER_BLOCK } from './constants';
import { SequencerPattern } from './types';

function shouldEnableStep(stepIndexInBlock: number): boolean {
  const isBlockStart = stepIndexInBlock === 0;
  const isDownbeat = stepIndexInBlock % 2 === 0;
  const probability = isBlockStart
    ? BLOCK_PATTERN_PROBABILITY_CONFIG.blockStart
    : isDownbeat
      ? BLOCK_PATTERN_PROBABILITY_CONFIG.downbeat
      : BLOCK_PATTERN_PROBABILITY_CONFIG.offbeat;

  return Math.random() < probability;
}

export function generateBlockPattern(): boolean[] {
  return Array.from({ length: STEPS_PER_BLOCK }, (_, stepIndex) => shouldEnableStep(stepIndex));
}

export function generateSequencerPattern(): SequencerPattern {
  return Array.from({ length: BLOCK_COUNT }, () => generateBlockPattern()).flat();
}

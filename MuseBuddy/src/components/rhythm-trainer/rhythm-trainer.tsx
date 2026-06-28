import { useCallback, useState } from 'react';

import { RhythmTrainerPage } from '@/pages/rhythm-trainer';

import { BPM_STEP, DEFAULT_BPM, MAX_BPM, MIN_BPM, STEPS_PER_BLOCK } from './constants';
import { generateBlockPattern, generateSequencerPattern, shuffleBlockPattern } from './pattern';
import { SequencerPattern } from './types';
import { useSequencerPlayback } from './use-sequencer-playback';

export function RhythmTrainer() {
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [pattern, setPattern] = useState<SequencerPattern>(() => generateSequencerPattern());
  const { currentStepIndex, isPlaying, togglePlayback } = useSequencerPlayback({ bpm, pattern });

  const decreaseBpm = useCallback(() => {
    setBpm((value) => Math.max(MIN_BPM, value - BPM_STEP));
  }, []);

  const increaseBpm = useCallback(() => {
    setBpm((value) => Math.min(MAX_BPM, value + BPM_STEP));
  }, []);

  const regenerateBar = useCallback((barIndex: number) => {
    setPattern((currentPattern) => {
      const barStartIndex = barIndex * STEPS_PER_BLOCK;
      const regeneratedBar = generateBlockPattern();
      const nextPattern = [...currentPattern];
      nextPattern.splice(barStartIndex, STEPS_PER_BLOCK, ...regeneratedBar);
      return nextPattern;
    });
  }, []);

  const shuffleBar = useCallback((barIndex: number) => {
    setPattern((currentPattern) => {
      const barStartIndex = barIndex * STEPS_PER_BLOCK;
      const shuffledBar = shuffleBlockPattern(
        currentPattern.slice(barStartIndex, barStartIndex + STEPS_PER_BLOCK),
      );
      const nextPattern = [...currentPattern];
      nextPattern.splice(barStartIndex, STEPS_PER_BLOCK, ...shuffledBar);
      return nextPattern;
    });
  }, []);

  return (
    <RhythmTrainerPage
      bpm={bpm}
      canDecreaseBpm={bpm > MIN_BPM}
      canIncreaseBpm={bpm < MAX_BPM}
      currentStepIndex={currentStepIndex}
      isPlaying={isPlaying}
      onDecreaseBpm={decreaseBpm}
      onIncreaseBpm={increaseBpm}
      onRegenerateBar={regenerateBar}
      onShuffleBar={shuffleBar}
      onTogglePlayback={togglePlayback}
      pattern={pattern}
    />
  );
}

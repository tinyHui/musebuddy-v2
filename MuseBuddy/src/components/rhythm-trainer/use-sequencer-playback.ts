import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';

import { TOTAL_STEPS } from './constants';
import { SequencerPattern } from './types';

const BEEP_SOURCE = require('@assets/audio/sequencer-beep.wav');

type UseSequencerPlaybackOptions = {
  bpm: number;
  pattern: SequencerPattern;
};

export function useSequencerPlayback({ bpm, pattern }: UseSequencerPlaybackOptions) {
  const beepPlayer = useAudioPlayer(BEEP_SOURCE);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const eighthNoteDurationMs = 30_000 / bpm;

  const playBeep = useCallback(() => {
    void beepPlayer.seekTo(0).finally(() => {
      beepPlayer.play();
    });
  }, [beepPlayer]);

  useEffect(() => {
    if (!isPlaying || currentStepIndex === null || !pattern[currentStepIndex]) {
      return;
    }

    playBeep();
  }, [currentStepIndex, isPlaying, pattern, playBeep]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentStepIndex((stepIndex) => (stepIndex === null ? 0 : (stepIndex + 1) % TOTAL_STEPS));
    }, eighthNoteDurationMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [eighthNoteDurationMs, isPlaying]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(null);
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying((playing) => {
      const nextPlaying = !playing;
      setCurrentStepIndex(nextPlaying ? 0 : null);
      return nextPlaying;
    });
  }, []);

  return {
    currentStepIndex,
    isPlaying,
    stopPlayback,
    togglePlayback,
  };
}

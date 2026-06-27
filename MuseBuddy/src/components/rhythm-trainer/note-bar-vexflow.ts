export const DEFAULT_NOTE_KEY = 'g/4';
export const BAR_STEP_COUNT = 8;

export type VexflowDuration = '8' | 'q' | 'h' | 'w';

export type NoteBarVexflowEvent = {
  duration: VexflowDuration;
  id: string;
  kind: 'note' | 'rest';
  noteKey?: string;
  dots: 0 | 1;
  startStep: number;
  stepCount: number;
  tieFromPrevious: boolean;
  tieToNext: boolean;
};

type ConvertOptions = {
  noteKey?: string;
};

type Run = {
  kind: 'note' | 'rest';
  startStep: number;
  stepCount: number;
};

const DURATION_BY_STEP_COUNT: Record<number, { duration: VexflowDuration; dots: 0 | 1 }> = {
  1: { duration: '8', dots: 0 },
  2: { duration: 'q', dots: 0 },
  3: { duration: 'q', dots: 1 },
  4: { duration: 'h', dots: 0 },
  6: { duration: 'h', dots: 1 },
  8: { duration: 'w', dots: 0 },
};

export function convertBooleanBarToVexflowEvents(
  steps: readonly boolean[],
  options: ConvertOptions = {},
): NoteBarVexflowEvent[] {
  if (steps.length !== BAR_STEP_COUNT) {
    throw new Error(`Expected ${BAR_STEP_COUNT} bar steps, received ${steps.length}.`);
  }

  const noteKey = options.noteKey ?? DEFAULT_NOTE_KEY;

  const runs = collectRuns(steps);

  return runs.flatMap((run, runIndex) => {
    const segments = splitRunForBeginnerCounting(run, runs[runIndex - 1]);

    return segments.map((stepCount, segmentIndex) => {
      const startStep =
        run.startStep + segments.slice(0, segmentIndex).reduce((total, count) => total + count, 0);
      const duration = getDurationForStepCount(stepCount);
      const isSplitNote = run.kind === 'note' && segments.length > 1;

      return {
        ...duration,
        id: `${run.startStep}-${run.kind}-${segmentIndex}`,
        kind: run.kind,
        noteKey: run.kind === 'note' ? noteKey : undefined,
        startStep,
        stepCount,
        tieFromPrevious: isSplitNote && segmentIndex > 0,
        tieToNext: isSplitNote && segmentIndex < segments.length - 1,
      };
    });
  });
}

function collectRuns(steps: readonly boolean[]): Run[] {
  const runs: Run[] = [];
  let runStart = 0;
  let currentValue = steps[0];

  for (let stepIndex = 1; stepIndex <= steps.length; stepIndex += 1) {
    if (steps[stepIndex] === currentValue) {
      continue;
    }

    runs.push({
      kind: currentValue ? 'note' : 'rest',
      startStep: runStart,
      stepCount: stepIndex - runStart,
    });

    runStart = stepIndex;
    currentValue = steps[stepIndex];
  }

  return runs;
}

function splitRunForBeginnerCounting(run: Run, previousRun?: Run): number[] {
  const isOffbeatStart = run.startStep % 2 === 1;

  if (!isOffbeatStart) {
    return splitBeatAlignedRun(run);
  }

  if (run.kind === 'note') {
    return splitOffbeatNoteRun(run.stepCount);
  }

  return splitOffbeatRestRun(run, previousRun);
}

function splitBeatAlignedRun(run: Run): number[] {
  switch (run.stepCount) {
    case 3:
      return run.kind === 'rest' ? [2, 1] : [3];
    case 5:
      return [4, 1];
    case 7:
      return [6, 1];
    default:
      return [run.stepCount];
  }
}

function splitOffbeatNoteRun(stepCount: number): number[] {
  switch (stepCount) {
    case 3:
      return [1, 2];
    case 4:
      return [1, 2, 1];
    case 5:
      return [1, 4];
    case 6:
      return [1, 4, 1];
    case 7:
      return [1, 4, 2];
    default:
      return [stepCount];
  }
}

function splitOffbeatRestRun(run: Run, previousRun?: Run): number[] {
  if (run.startStep === 5 && run.stepCount === 3 && previousRun?.startStep === 0) {
    return [3];
  }

  if (run.startStep === 5 && run.stepCount === 3) {
    return [2, 1];
  }

  switch (run.stepCount) {
    case 3:
      return [1, 2];
    case 5:
      return run.startStep === 3 ? [4, 1] : [1, 4];
    case 6:
      return [1, 4, 1];
    case 7:
      return [1, 4, 2];
    default:
      return [run.stepCount];
  }
}

function getDurationForStepCount(stepCount: number): { duration: VexflowDuration; dots: 0 | 1 } {
  const duration = DURATION_BY_STEP_COUNT[stepCount];

  if (!duration) {
    throw new Error(`Unsupported duration segment: ${stepCount} steps.`);
  }

  return duration;
}

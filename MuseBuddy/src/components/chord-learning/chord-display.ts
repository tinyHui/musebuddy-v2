import {
  chordIntervalMetadata,
  diatonicNoteLetters,
  naturalNoteSemitones,
  type ChordInterval,
  type ChordQuality,
  type ChordRoot,
  type MusicAccidental,
  type MusicNoteLetter,
  type PianoKeyboardKeyName,
} from '@schema/music-theory-schema';
import type { ChordLearningChord } from '../../training/daily-training-schema';

export type ChordDisplayTokenType =
  | 'root'
  | 'quality'
  | 'extension'
  | 'alteration'
  | 'addition'
  | 'omission'
  | 'bass'
  | 'separator';

export type ChordDisplayToken = {
  componentId?: string;
  interval?: ChordInterval;
  note?: string;
  text: string;
  type: ChordDisplayTokenType;
};

export type ChordDisplayNote = {
  accidental: MusicAccidental;
  interval: ChordInterval;
  isRoot: boolean;
  keyboardKey: PianoKeyboardKeyName;
  letter: MusicNoteLetter;
  octave: number;
  text: string;
};

export type ChordDisplay = {
  commonNotations: readonly string[];
  friendlyName: string;
  notes: readonly ChordDisplayNote[];
  symbol: string;
  tokens: readonly ChordDisplayToken[];
};

const QUALITY_DISPLAY = {
  dominant7: {
    aliases: ['7'],
    extensionToken: '7',
    friendlyLabel: 'dominant seventh',
    qualityToken: '',
  },
  major: {
    aliases: [''],
    extensionToken: '',
    friendlyLabel: 'major',
    qualityToken: '',
  },
  major7: {
    aliases: ['maj7', 'M7'],
    extensionToken: '7',
    friendlyLabel: 'major seventh',
    qualityToken: 'maj',
  },
  minor: {
    aliases: ['m', 'min'],
    extensionToken: '',
    friendlyLabel: 'minor',
    qualityToken: 'm',
  },
  minor7: {
    aliases: ['m7', 'min7'],
    extensionToken: '7',
    friendlyLabel: 'minor seventh',
    qualityToken: 'm',
  },
} satisfies Record<
  ChordQuality,
  {
    aliases: readonly string[];
    extensionToken: string;
    friendlyLabel: string;
    qualityToken: string;
  }
>;

export function buildChordDisplay(chord: ChordLearningChord): ChordDisplay {
  const rootText = formatRoot(chord.root);
  const qualityDisplay = QUALITY_DISPLAY[chord.quality];
  const omitIntervals = new Set(chord.omit ?? []);
  const notes = chord.intervals
    .filter((interval) => !omitIntervals.has(interval))
    .map((interval) => buildNote(chord.root, interval));
  const tokens: ChordDisplayToken[] = [
    {
      componentId: 'root',
      interval: '1',
      note: rootText,
      text: rootText,
      type: 'root',
    },
  ];

  if (qualityDisplay.qualityToken) {
    tokens.push({
      componentId: 'quality',
      text: qualityDisplay.qualityToken,
      type: 'quality',
    });
  }

  if (qualityDisplay.extensionToken) {
    tokens.push({
      componentId: 'extension',
      interval: chord.quality === 'major7' ? '7' : 'b7',
      text: qualityDisplay.extensionToken,
      type: 'extension',
    });
  }

  chord.add?.forEach((interval) => {
    tokens.push({
      componentId: `add-${interval}`,
      interval,
      text: `(add${stripIntervalAccidentals(interval)})`,
      type: 'addition',
    });
  });

  chord.alterations?.forEach((interval) => {
    tokens.push({
      componentId: `alteration-${interval}`,
      interval,
      text: interval,
      type: 'alteration',
    });
  });

  chord.omit?.forEach((interval) => {
    tokens.push({
      componentId: `omit-${interval}`,
      interval,
      text: `(omit${stripIntervalAccidentals(interval)})`,
      type: 'omission',
    });
  });

  if (chord.bass) {
    tokens.push(
      { text: '/', type: 'separator' },
      {
        componentId: 'bass',
        note: formatRoot(chord.bass),
        text: formatRoot(chord.bass),
        type: 'bass',
      },
    );
  }

  const symbol = tokens.map((token) => token.text).join('');
  const commonNotations = qualityDisplay.aliases.map((alias) => `${rootText}${alias}`);
  const friendlyName =
    chord.friendlyName ?? `${rootText} ${qualityDisplay.friendlyLabel}`.replace(/\s+/g, ' ');

  return {
    commonNotations,
    friendlyName,
    notes,
    symbol,
    tokens,
  };
}

function buildNote(root: ChordRoot, interval: ChordInterval): ChordDisplayNote {
  const rootText = formatRoot(root);
  const intervalInfo = chordIntervalMetadata[interval];
  const rootLetterIndex = diatonicNoteLetters.indexOf(root.letter);
  const targetLetterIndex =
    (rootLetterIndex + intervalInfo.degree - 1) % diatonicNoteLetters.length;
  const letter = diatonicNoteLetters[targetLetterIndex];
  const targetNaturalSemitone = naturalNoteSemitones[letter];
  const rootSemitone = getRootSemitone(root);
  const targetSemitone = (rootSemitone + intervalInfo.semitones) % 12;
  const accidentalOffset = normalizeAccidentalOffset(targetSemitone - targetNaturalSemitone);
  const accidental = accidentalOffsetToText(accidentalOffset);
  const text = `${letter}${accidental}` as PianoKeyboardKeyName;
  const octave = intervalInfo.semitones >= 12 ? 5 : 4;

  return {
    accidental,
    interval,
    isRoot: interval === '1',
    keyboardKey: text,
    letter,
    octave,
    text: interval === '1' ? rootText : text,
  };
}

function formatRoot(root: ChordRoot) {
  return `${root.letter}${root.accidental}`;
}

function getRootSemitone(root: ChordRoot) {
  return (naturalNoteSemitones[root.letter] + accidentalTextToOffset(root.accidental) + 12) % 12;
}

function accidentalTextToOffset(accidental: ChordRoot['accidental']) {
  switch (accidental) {
    case '#':
      return 1;
    case 'b':
      return -1;
    default:
      return 0;
  }
}

function accidentalOffsetToText(offset: number): ChordDisplayNote['accidental'] {
  switch (offset) {
    case 1:
      return '#';
    case -1:
      return 'b';
    default:
      return '';
  }
}

function normalizeAccidentalOffset(offset: number) {
  const normalized = ((offset + 18) % 12) - 6;

  if (normalized === 11) {
    return -1;
  }

  if (normalized === -11) {
    return 1;
  }

  return normalized;
}

function stripIntervalAccidentals(interval: ChordInterval) {
  return interval.replaceAll('b', '').replaceAll('#', '');
}

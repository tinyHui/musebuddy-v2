export type CanonicalPianoKeyboardKeyName =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

export type PianoKeyboardKeyName = CanonicalPianoKeyboardKeyName | 'Db' | 'Eb' | 'Gb' | 'Ab' | 'Bb';

export type PianoKeyboardMarker = {
  key: CanonicalPianoKeyboardKeyName;
  isRoot: boolean;
};

export function normalizePianoKeyboardKey(
  key: PianoKeyboardKeyName,
): CanonicalPianoKeyboardKeyName {
  switch (key) {
    case 'Db':
      return 'C#';
    case 'Eb':
      return 'D#';
    case 'Gb':
      return 'F#';
    case 'Ab':
      return 'G#';
    case 'Bb':
      return 'A#';
    default:
      return key;
  }
}

export function getPianoKeyboardMarkers(
  root: PianoKeyboardKeyName,
  keys: readonly PianoKeyboardKeyName[] = [],
): PianoKeyboardMarker[] {
  const rootKey = normalizePianoKeyboardKey(root);
  const selectedKeys = new Set<CanonicalPianoKeyboardKeyName>([
    rootKey,
    ...keys.map((key) => normalizePianoKeyboardKey(key)),
  ]);

  return [...selectedKeys].map((key) => ({
    key,
    isRoot: key === rootKey,
  }));
}

import {
  normalizePianoKeyboardKey,
  type CanonicalPianoKeyboardKeyName,
  type PianoKeyboardKeyName,
} from '@schema/music-theory-schema';

export { normalizePianoKeyboardKey };
export type { CanonicalPianoKeyboardKeyName, PianoKeyboardKeyName };

export type PianoKeyboardMarker = {
  key: CanonicalPianoKeyboardKeyName;
  isRoot: boolean;
};

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

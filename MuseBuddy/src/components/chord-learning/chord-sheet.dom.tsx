'use dom';

import { useEffect, useId, useRef } from 'react';
import { Accidental, Factory, StaveNote } from 'vexflow';

import type { ChordDisplayNote } from './chord-display';

type ChordSheetProps = {
  dom?: import('expo/dom').DOMProps;
  notes: readonly ChordDisplayNote[];
};

const STAVE_HEIGHT = 148;
const STAVE_WIDTH = 328;

export default function ChordSheet({ notes }: ChordSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementId = useId().replaceAll(':', '-');

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.innerHTML = '';

    const factory = new Factory({
      renderer: {
        elementId,
        height: STAVE_HEIGHT,
        width: STAVE_WIDTH,
      },
    });
    const context = factory.getContext();
    const stave = factory.Stave({ width: STAVE_WIDTH - 16, x: 8, y: 18 });
    stave.addClef('treble');
    stave.setContext(context).draw();

    const staveNote = new StaveNote({
      clef: 'treble',
      duration: 'w',
      keys: notes.map((note) => `${note.letter.toLowerCase()}/${note.octave}`),
    });

    notes.forEach((note, noteIndex) => {
      if (note.accidental) {
        staveNote.addModifier(new Accidental(note.accidental), noteIndex);
      }
    });

    const voice = factory.Voice({ time: '4/4' }).setStrict(false);
    voice.addTickable(staveNote);
    factory
      .Formatter()
      .joinVoices([voice])
      .format([voice], STAVE_WIDTH - 96);
    voice.draw(context, stave);
  }, [elementId, notes]);

  return (
    <div
      aria-label="Sheet music for today's chord"
      id={elementId}
      ref={containerRef}
      style={{
        alignItems: 'center',
        background: '#ffffff',
        display: 'flex',
        height: STAVE_HEIGHT,
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
      }}
    />
  );
}

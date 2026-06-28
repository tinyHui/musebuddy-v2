'use dom';

import { useEffect, useId, useRef } from 'react';
import { Dot, Factory, StaveNote } from 'vexflow';

import { DEFAULT_NOTE_KEY, NoteBarVexflowEvent } from './note-bar-vexflow';

type NoteBarSheetProps = {
  currentStepIndex: number | null;
  events: readonly NoteBarVexflowEvent[];
  dom?: import('expo/dom').DOMProps;
};

const STAVE_WIDTH = 328;
const STAVE_HEIGHT = 120;

export default function NoteBarSheet({ currentStepIndex, events }: NoteBarSheetProps) {
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
        width: STAVE_WIDTH,
        height: STAVE_HEIGHT,
      },
    });
    const context = factory.getContext();
    const stave = factory.Stave({ x: 8, y: 8, width: STAVE_WIDTH - 16 });
    stave.addClef('treble').addTimeSignature('4/4');
    stave.setContext(context).draw();

    const notes = events.map((event) => {
      const duration = `${event.duration}${event.kind === 'rest' ? 'r' : ''}`;
      const staveNote = new StaveNote({
        clef: 'treble',
        duration,
        keys: [event.kind === 'note' ? (event.noteKey ?? DEFAULT_NOTE_KEY) : 'b/4'],
      });

      Array.from({ length: event.dots }).forEach(() => {
        Dot.buildAndAttach([staveNote], { all: true });
      });

      const isCurrent =
        currentStepIndex !== null &&
        currentStepIndex >= event.startStep &&
        currentStepIndex < event.startStep + event.stepCount;

      if (isCurrent) {
        staveNote.setStyle({ fillStyle: '#6f991c', strokeStyle: '#6f991c' });
      }

      return staveNote;
    });

    const voice = factory.Voice({ time: '4/4' }).setStrict(false);
    voice.addTickables(notes);
    factory
      .Formatter()
      .joinVoices([voice])
      .format([voice], STAVE_WIDTH - 86);
    voice.draw(context, stave);

    events.forEach((event, eventIndex) => {
      if (!event.tieToNext) {
        return;
      }

      factory
        .StaveTie({
          from: notes[eventIndex],
          to: notes[eventIndex + 1],
          firstIndexes: [0],
          lastIndexes: [0],
        })
        .setContext(context)
        .draw();
    });
  }, [currentStepIndex, elementId, events]);

  return (
    <div
      aria-label="Note preview for rhythm bar"
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

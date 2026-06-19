import { Square } from 'lucide-react';
import type { Rhythm } from './metronome';
import type { Song } from './songs';

type SongPracticePageProps = {
  song: Song | null;
  rhythm: Rhythm | null;
  currentSectionIndex: number;
  currentBeat: number;
  currentBarInSection: number;
  isCountIn: boolean;
  isComplete: boolean;
  onStop: () => void;
};

function SongPracticePage({
  song,
  rhythm,
  currentSectionIndex,
  currentBeat,
  currentBarInSection,
  isCountIn,
  isComplete,
  onStop,
}: SongPracticePageProps) {
  const currentSection = song?.structure[currentSectionIndex] ?? null;
  const nextSection = isCountIn ? currentSection : (song?.structure[currentSectionIndex + 1] ?? null);

  return (
    <section className="practice-screen" aria-labelledby="practice-title">
      <div className="practice-topbar">
        <div>
          <p className="eyebrow">{song ? `${song.bpm} BPM · ${rhythm?.label ?? song.rhythmId}` : 'Song practice'}</p>
          <h1 id="practice-title">{song?.name ?? 'No song playing'}</h1>
        </div>
        <button className="text-button stop-button" type="button" onClick={onStop}>
          <Square size={16} fill="currentColor" />
          Stop
        </button>
      </div>

      <div className="practice-current" aria-live="polite">
        <span>{isComplete ? 'Complete' : isCountIn ? 'Count in' : (currentSection?.name ?? 'Ready')}</span>
      </div>

      <div className="practice-progress">
        {rhythm ? (
          <div
            className="beat-strip practice-beats"
            aria-label={`${rhythm.label} beat indicator`}
            style={{ gridTemplateColumns: `repeat(${rhythm.beatsPerBar}, minmax(18px, 1fr))` }}
          >
            {Array.from({ length: rhythm.beatsPerBar }, (_, index) => (
              <span
                className={[
                  'beat-dot',
                  index === 0 ? 'beat-dot-accent' : '',
                  index === currentBeat && !isComplete ? 'beat-dot-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={index}
              />
            ))}
          </div>
        ) : null}
        <p>
          {isCountIn
            ? `Count-in bar ${currentBarInSection} of 2`
            : currentSection && !isComplete
              ? `Bar ${currentBarInSection} of ${currentSection.bars}`
              : 'Song finished'}
        </p>
      </div>

      <div className="practice-next">
        <span>Next</span>
        <strong>{isComplete ? 'Done' : (nextSection?.name ?? 'End')}</strong>
      </div>
    </section>
  );
}

export default SongPracticePage;

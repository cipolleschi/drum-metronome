import { Minus, Music2, Pause, Play, Plus, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RHYTHMS, useMetronome } from './metronome';
import SongPracticePage from './SongPracticePage';
import { useSongPlayer } from './songPlayer';
import SongsPage from './SongsPage';
import { DEMO_SONGS, PRELOADED_SONGS, type Song } from './songs';

type Page = 'metronome' | 'songs' | 'practice';

const SONG_STORAGE_KEY = 'drum-metronome:songs';

type SongState = {
  songs: Song[];
  selectedSongId: string | null;
};

const mergePreloadedSongs = (songs: Song[]) => {
  const savedSongNames = new Set(songs.map((song) => song.name.trim().toLowerCase()));
  const missingPreloadedSongs = PRELOADED_SONGS.filter((song) => !savedSongNames.has(song.name.trim().toLowerCase()));

  return [...missingPreloadedSongs, ...songs];
};

const loadSongs = (): Song[] => {
  const storedSongs = window.localStorage.getItem(SONG_STORAGE_KEY);

  if (!storedSongs) {
    return DEMO_SONGS;
  }

  try {
    return mergePreloadedSongs(JSON.parse(storedSongs) as Song[]);
  } catch {
    return DEMO_SONGS;
  }
};

const loadSongState = (): SongState => {
  const songs = loadSongs();

  return {
    songs,
    selectedSongId: songs[0]?.id ?? null,
  };
};

function App() {
  const { tempo, rhythm, currentBeat, isPlaying, setTempo, setRhythm, toggle } = useMetronome();
  const songPlayer = useSongPlayer();
  const [activePage, setActivePage] = useState<Page>('metronome');
  const [songState, setSongState] = useState<SongState>(loadSongState);
  const { songs, selectedSongId } = songState;

  useEffect(() => {
    window.localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    if (activePage === 'practice' && songPlayer.isComplete) {
      const redirectTimeout = window.setTimeout(() => {
        setActivePage('songs');
      }, 0);

      return () => window.clearTimeout(redirectTimeout);
    }
  }, [activePage, songPlayer.isComplete]);

  const selectSongsPage = () => {
    songPlayer.stopSong();
    setActivePage('songs');
  };

  const selectMetronomePage = () => {
    songPlayer.stopSong();
    setActivePage('metronome');
  };

  const createSong = (song: Song) => {
    setSongState((current) => ({
      songs: [song, ...current.songs],
      selectedSongId: song.id,
    }));
  };

  const updateSong = (song: Song) => {
    setSongState((current) => ({
      songs: current.songs.map((candidate) => (candidate.id === song.id ? song : candidate)),
      selectedSongId: song.id,
    }));
  };

  const deleteSong = (songId: string) => {
    setSongState((current) => {
      const nextSongs = current.songs.filter((song) => song.id !== songId);

      return {
        songs: nextSongs,
        selectedSongId: current.selectedSongId === songId ? (nextSongs[0]?.id ?? null) : current.selectedSongId,
      };
    });
  };

  const selectSong = (songId: string) => {
    setSongState((current) => ({
      ...current,
      selectedSongId: songId,
    }));
  };

  const playSong = (song: Song) => {
    void songPlayer.startSong(song).then(() => {
      setActivePage('practice');
    });
  };

  const stopPractice = () => {
    songPlayer.stopSong();
    setActivePage('songs');
  };

  return (
    <main className="app-shell">
      <div className="app-frame">
        {activePage !== 'practice' ? (
          <nav className="app-nav" aria-label="Primary">
            <button
              className={activePage === 'metronome' ? 'nav-button nav-button-active' : 'nav-button'}
              type="button"
              onClick={selectMetronomePage}
            >
              <Timer size={18} />
              Metronome
            </button>
            <button
              className={activePage === 'songs' ? 'nav-button nav-button-active' : 'nav-button'}
              type="button"
              onClick={selectSongsPage}
            >
              <Music2 size={18} />
              Songs
            </button>
          </nav>
        ) : null}

        {activePage === 'metronome' ? (
          <section className="metronome-panel" aria-labelledby="page-title">
            <div className="heading">
              <p className="eyebrow">Drummer practice tool</p>
              <h1 id="page-title">Metronome</h1>
            </div>

            <div className="tempo-readout" aria-live="polite">
              <span className="tempo-number">{tempo}</span>
              <span className="tempo-unit">BPM</span>
            </div>

            <div className="transport-row">
              <button
                className="icon-button"
                type="button"
                aria-label="Decrease tempo"
                title="Decrease tempo"
                onClick={() => setTempo(tempo - 1)}
              >
                <Minus size={22} strokeWidth={2.4} />
              </button>

              <button
                className="play-button"
                type="button"
                aria-label={isPlaying ? 'Pause metronome' : 'Play metronome'}
                onClick={toggle}
              >
                {isPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
              </button>

              <button
                className="icon-button"
                type="button"
                aria-label="Increase tempo"
                title="Increase tempo"
                onClick={() => setTempo(tempo + 1)}
              >
                <Plus size={22} strokeWidth={2.4} />
              </button>
            </div>

            <label className="field">
              <span>Tempo</span>
              <input
                type="range"
                min="40"
                max="240"
                value={tempo}
                onChange={(event) => setTempo(Number(event.target.value))}
              />
            </label>

            <div className="field">
              <span>Rhythm</span>
              <div className="rhythm-options" role="radiogroup" aria-label="Rhythm">
                {RHYTHMS.map((candidate) => (
                  <button
                    className={candidate.id === rhythm.id ? 'rhythm-button rhythm-button-active' : 'rhythm-button'}
                    key={candidate.id}
                    type="button"
                    role="radio"
                    aria-checked={candidate.id === rhythm.id}
                    onClick={() => setRhythm(candidate.id)}
                  >
                    {candidate.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="beat-strip"
              aria-label={`${rhythm.label} beat indicator`}
              style={{ gridTemplateColumns: `repeat(${rhythm.beatsPerBar}, minmax(14px, 1fr))` }}
            >
              {Array.from({ length: rhythm.beatsPerBar }, (_, index) => (
                <span
                  className={[
                    'beat-dot',
                    index === 0 ? 'beat-dot-accent' : '',
                    index === currentBeat && isPlaying ? 'beat-dot-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={index}
                  aria-label={`Beat ${index + 1}`}
                />
              ))}
            </div>
          </section>
        ) : activePage === 'songs' ? (
          <SongsPage
            songs={songs}
            selectedSongId={selectedSongId}
            onCreateSong={createSong}
            onDeleteSong={deleteSong}
            onPlaySong={playSong}
            onSelectSong={selectSong}
            onUpdateSong={updateSong}
          />
        ) : (
          <SongPracticePage
            song={songPlayer.song}
            rhythm={songPlayer.rhythm}
            currentSectionIndex={songPlayer.currentSectionIndex}
            currentBeat={songPlayer.currentBeat}
            currentBarInSection={songPlayer.currentBarInSection}
            isCountIn={songPlayer.isCountIn}
            isComplete={songPlayer.isComplete}
            onStop={stopPractice}
          />
        )}
      </div>
    </main>
  );
}

export default App;

import { Edit3, GripVertical, Play, Plus, Save, Trash2, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { RHYTHMS } from './metronome';
import {
  createEmptySongDraft,
  createId,
  draftFromSong,
  songFromDraft,
  type Song,
  type SongDraft,
} from './songs';

type SongsPageProps = {
  songs: Song[];
  selectedSongId: string | null;
  onCreateSong: (song: Song) => void;
  onDeleteSong: (songId: string) => void;
  onPlaySong: (song: Song) => void;
  onSelectSong: (songId: string) => void;
  onUpdateSong: (song: Song) => void;
};

type EditorMode = 'create' | 'edit';

type EditorState = {
  mode: EditorMode;
  songId: string | null;
  draft: SongDraft;
};

const getRhythmLabel = (rhythmId: string) => RHYTHMS.find((rhythm) => rhythm.id === rhythmId)?.label ?? rhythmId;

const getTotalBars = (song: Song) => song.structure.reduce((total, section) => total + section.bars, 0);

function SongsPage({
  songs,
  selectedSongId,
  onCreateSong,
  onDeleteSong,
  onPlaySong,
  onSelectSong,
  onUpdateSong,
}: SongsPageProps) {
  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedSongId) ?? songs[0] ?? null,
    [selectedSongId, songs],
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

  const updateDraft = (recipe: (draft: SongDraft) => SongDraft) => {
    setEditor((current) => (current ? { ...current, draft: recipe(current.draft) } : current));
  };

  const startCreate = () => {
    setEditor({ mode: 'create', songId: null, draft: createEmptySongDraft() });
  };

  const startEdit = (song: Song) => {
    setEditor({ mode: 'edit', songId: song.id, draft: draftFromSong(song) });
  };

  const saveEditor = () => {
    if (!editor) {
      return;
    }

    const savedSong = songFromDraft(editor.draft, editor.songId ?? undefined);

    if (editor.mode === 'create') {
      onCreateSong(savedSong);
    } else {
      onUpdateSong(savedSong);
    }

    setEditor(null);
  };

  const insertSectionAt = (sectionIndex: number) => {
    updateDraft((draft) => ({
      ...draft,
      structure: [
        ...draft.structure.slice(0, sectionIndex),
        { id: createId(), name: '', bars: 4 },
        ...draft.structure.slice(sectionIndex),
      ],
    }));
  };

  const moveSection = (sectionId: string, targetIndex: number) => {
    updateDraft((draft) => {
      const currentIndex = draft.structure.findIndex((section) => section.id === sectionId);

      if (currentIndex === -1 || currentIndex === targetIndex) {
        return draft;
      }

      const nextStructure = [...draft.structure];
      const [movedSection] = nextStructure.splice(currentIndex, 1);
      nextStructure.splice(targetIndex, 0, movedSection);

      return {
        ...draft,
        structure: nextStructure,
      };
    });
  };

  return (
    <section className="songs-layout" aria-labelledby="songs-title">
      <div className="songs-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Song library</p>
            <h1 id="songs-title">Songs</h1>
          </div>
          <button className="icon-button compact" type="button" aria-label="Create song" title="Create song" onClick={startCreate}>
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </div>

        <div className="song-list" aria-label="Saved songs">
          {songs.map((song) => (
            <button
              className={song.id === selectedSong?.id ? 'song-list-item song-list-item-active' : 'song-list-item'}
              key={song.id}
              type="button"
              onClick={() => onSelectSong(song.id)}
            >
              <span className="song-list-name">{song.name}</span>
              <span className="song-list-meta">
                {song.bpm} BPM · {getRhythmLabel(song.rhythmId)} · {getTotalBars(song)} bars
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="song-detail-panel">
        {selectedSong ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">{selectedSong.bpm} BPM</p>
                <h2>{selectedSong.name}</h2>
                <p className="detail-meta">
                  {getRhythmLabel(selectedSong.rhythmId)} · {getTotalBars(selectedSong)} total bars
                </p>
              </div>
              <div className="detail-actions">
                <button className="icon-button compact primary" type="button" aria-label="Play song" title="Play song" onClick={() => onPlaySong(selectedSong)}>
                  <Play size={18} fill="currentColor" />
                </button>
                <button className="icon-button compact" type="button" aria-label="Edit song" title="Edit song" onClick={() => startEdit(selectedSong)}>
                  <Edit3 size={18} />
                </button>
                <button
                  className="icon-button compact danger"
                  type="button"
                  aria-label="Delete song"
                  title="Delete song"
                  onClick={() => onDeleteSong(selectedSong.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <ol className="structure-list">
              {selectedSong.structure.map((section, index) => (
                <li className="structure-row" key={section.id}>
                  <span className="section-index">{index + 1}</span>
                  <span className="section-name">{section.name}</span>
                  <span className="section-bars">{section.bars} bars</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="empty-state">
            <h2>No songs yet</h2>
            <p>Create a song to start building your practice library.</p>
          </div>
        )}
      </div>

      {editor ? (
        <div className="editor-panel" aria-label={editor.mode === 'create' ? 'Create song form' : 'Edit song form'}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">{editor.mode === 'create' ? 'New song' : 'Editing'}</p>
              <h2>{editor.mode === 'create' ? 'Create Song' : 'Edit Song'}</h2>
            </div>
            <button className="icon-button compact" type="button" aria-label="Close editor" title="Close editor" onClick={() => setEditor(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="song-form">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={editor.draft.name}
                onChange={(event) => updateDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="Song name"
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>BPM</span>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={editor.draft.bpm}
                  onChange={(event) => updateDraft((draft) => ({ ...draft, bpm: Number(event.target.value) }))}
                />
              </label>

              <label className="field">
                <span>Rhythm</span>
                <select
                  value={editor.draft.rhythmId}
                  onChange={(event) => updateDraft((draft) => ({ ...draft, rhythmId: event.target.value }))}
                >
                  {RHYTHMS.map((rhythm) => (
                    <option key={rhythm.id} value={rhythm.id}>
                      {rhythm.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="section-editor-header">
              <span>Structure</span>
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  updateDraft((draft) => ({
                    ...draft,
                    structure: [...draft.structure, { id: createId(), name: '', bars: 4 }],
                  }))
                }
              >
                <Plus size={16} />
                Add section
              </button>
            </div>

            <div className="section-editor-list">
              {editor.draft.structure.map((section, index) => (
                <Fragment key={section.id}>
                  <div
                    className={draggedSectionId === section.id ? 'section-editor-row section-editor-row-dragging' : 'section-editor-row'}
                    draggable
                    onDragStart={(event) => {
                      setDraggedSectionId(section.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', section.id);
                    }}
                    onDragEnd={() => setDraggedSectionId(null)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedSectionId = event.dataTransfer.getData('text/plain') || draggedSectionId;

                      if (droppedSectionId) {
                        moveSection(droppedSectionId, index);
                      }

                      setDraggedSectionId(null);
                    }}
                  >
                    <span className="drag-handle" aria-hidden="true">
                      <GripVertical size={18} />
                    </span>
                    <input
                      type="text"
                      value={section.name}
                      onChange={(event) =>
                        updateDraft((draft) => ({
                          ...draft,
                          structure: draft.structure.map((candidate) =>
                            candidate.id === section.id ? { ...candidate, name: event.target.value } : candidate,
                          ),
                        }))
                      }
                      placeholder="Section"
                    />
                    <input
                      type="number"
                      min="1"
                      value={section.bars}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          insertSectionAt(index + 1);
                        }
                      }}
                      onChange={(event) =>
                        updateDraft((draft) => ({
                          ...draft,
                          structure: draft.structure.map((candidate) =>
                            candidate.id === section.id ? { ...candidate, bars: Number(event.target.value) } : candidate,
                          ),
                        }))
                      }
                      aria-label={`${section.name || 'Section'} bars`}
                    />
                    <button
                      className="icon-button compact danger"
                      type="button"
                      aria-label={`Remove ${section.name || 'section'}`}
                      title="Remove section"
                      onClick={() =>
                        updateDraft((draft) => ({
                          ...draft,
                          structure:
                            draft.structure.length === 1
                              ? draft.structure
                              : draft.structure.filter((candidate) => candidate.id !== section.id),
                        }))
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {index < editor.draft.structure.length - 1 ? (
                    <div className="section-insert-gap">
                      <button
                        className="section-insert-button"
                        type="button"
                        aria-label={`Add section after ${section.name || `section ${index + 1}`}`}
                        title="Add section here"
                        onClick={() => insertSectionAt(index + 1)}
                      >
                        <Plus size={16} strokeWidth={2.6} />
                      </button>
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>

            <button className="save-button" type="button" onClick={saveEditor}>
              <Save size={18} />
              Save song
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default SongsPage;

export type SongSection = {
  id: string;
  name: string;
  bars: number;
};

export type Song = {
  id: string;
  name: string;
  bpm: number;
  rhythmId: string;
  structure: SongSection[];
};

export type SongDraft = {
  name: string;
  bpm: number;
  rhythmId: string;
  structure: SongSection[];
};

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createEmptySongDraft = (): SongDraft => ({
  name: '',
  bpm: 120,
  rhythmId: '4-4',
  structure: [{ id: createId(), name: 'Intro', bars: 4 }],
});

export const DEMO_SONGS: Song[] = [
  {
    id: createId(),
    name: 'Practice Song',
    bpm: 120,
    rhythmId: '4-4',
    structure: [
      { id: createId(), name: 'Intro', bars: 4 },
      { id: createId(), name: 'Verse 1', bars: 16 },
      { id: createId(), name: 'Chorus', bars: 4 },
      { id: createId(), name: 'Verse 2', bars: 16 },
      { id: createId(), name: 'Bridge', bars: 2 },
      { id: createId(), name: 'Solo', bars: 16 },
      { id: createId(), name: 'Chorus', bars: 4 },
      { id: createId(), name: 'Chorus 2', bars: 4 },
      { id: createId(), name: 'Outro', bars: 16 },
    ],
  },
  {
    id: createId(),
    name: 'Slow Shuffle',
    bpm: 84,
    rhythmId: '6-8',
    structure: [
      { id: createId(), name: 'Count in', bars: 2 },
      { id: createId(), name: 'Verse', bars: 12 },
      { id: createId(), name: 'Turnaround', bars: 4 },
      { id: createId(), name: 'Chorus', bars: 8 },
    ],
  },
];

export const draftFromSong = (song: Song): SongDraft => ({
  name: song.name,
  bpm: song.bpm,
  rhythmId: song.rhythmId,
  structure: song.structure.map((section) => ({ ...section })),
});

export const songFromDraft = (draft: SongDraft, existingId?: string): Song => ({
  id: existingId ?? createId(),
  name: draft.name.trim() || 'Untitled song',
  bpm: Math.min(240, Math.max(40, Math.round(draft.bpm))),
  rhythmId: draft.rhythmId,
  structure: draft.structure
    .filter((section) => section.name.trim().length > 0 && section.bars > 0)
    .map((section) => ({
      ...section,
      name: section.name.trim(),
      bars: Math.max(1, Math.round(section.bars)),
    })),
});

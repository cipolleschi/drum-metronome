# Drum Metronome

A small React + Vite prototype for a drummer-focused music practice app. It currently has a metronome page and a song library page for tracking songs being studied.

## Commands Issued

```bash
pwd && ls
find . -maxdepth 2 -type f | sed 's#^./##' | head -80
node --version
npm --version
ls -la
npm create vite@latest drum-metronome -- --template react-ts
mkdir -p drum-metronome/src
npm install
ps -axo pid,ppid,command | grep 'npm install\|node .*npm\|Tests/drum-metronome' | grep -v grep
kill 61019
find . -maxdepth 3 -type f -print | sort
sed -n '1,260p' src/metronome.ts
sed -n '1,220p' src/App.tsx
sed -n '1,260p' README.md
npm run build
npm run lint
sed -n '1,260p' src/App.tsx
sed -n '1,320p' src/styles.css
sed -n '1,260p' src/metronome.ts
sed -n '1,260p' README.md
npm run build
npm run lint
sed -n '1,280p' src/App.tsx
sed -n '1,340p' src/SongsPage.tsx
sed -n '1,260p' src/metronome.ts
sed -n '1,420p' src/styles.css
npm run build
npm run lint
```

The `npm create vite@latest` command failed because the npm registry returned `503 Service Unavailable` for `create-vite`. Because of that, I created the Vite project files manually using the same basic structure as a React TypeScript Vite app.

I also started `npm install`, but stopped it after confirming that this environment likely cannot reach the npm registry reliably. Network-dependent commands should be run from your terminal.

The initial files were then refined manually:

- `package.json` keeps runtime dependencies separate from build/lint tooling.
- `eslint.config.js` uses `typescript-eslint` so TypeScript files are parsed correctly.
- The beat indicator grid is driven by the selected rhythm so `3/4` renders three beats, `5/4` renders five beats, and so on.
- `src/vite-env.d.ts` adds Vite's ambient client types so TypeScript understands CSS imports like `import './styles.css'`.
- The rhythm-change reset lives in `setRhythm` instead of a `useEffect`, because it is a direct result of the user action and avoids React's `set-state-in-effect` lint warning.
- `src/songs.ts` contains the song data model, demo data, and conversion helpers for create/edit forms.
- `src/SongsPage.tsx` contains the song library UI: saved songs, selected song details, and create/edit controls.
- `src/songPlayer.ts` contains song-practice playback timing, including section advancement and the automatic count-in.
- `src/SongPracticePage.tsx` contains the immersive practice screen shown while a song is playing.
- Song data is persisted with `localStorage` for now. This is intentionally simple for the prototype and keeps the app fully client-side until a backend such as Supabase is needed.

After the files were created, run:

```bash
npm install
npm run dev
```

The dev server URL will usually be:

```text
http://localhost:5173
```

For production validation:

```bash
npm run build
npm run lint
```

Current local verification status:

- `npm run build`: passing
- `npm run lint`: passing

## Technical Choices

- **React**: The app is built around component state and effects, which is the interview-relevant core of React.
- **TypeScript**: The metronome rhythm data and hook return values are typed so mistakes are caught earlier.
- **Vite**: Vite keeps the prototype lightweight and fast without adding framework concepts that are not needed yet.
- **Web Audio API**: The sounds are generated in the browser with oscillators, so no audio files or closed-source services are required.
- **lucide-react**: Play, pause, plus, and minus icons come from an OSS icon package instead of custom SVG code.

## Code Architecture

```text
src/
  App.tsx        UI for tempo controls, rhythm selection, transport, and beat indicator
  main.tsx       React entry point
  metronome.ts   Rhythm data and reusable metronome hook
  songPlayer.ts  Song playback hook for count-in, bar tracking, and section changes
  songs.ts       Song types, demo song data, and song draft helpers
  SongPracticePage.tsx Full-screen song playback UI
  SongsPage.tsx  Song list, detail, create, edit, and delete UI
  styles.css     App styling
```

### App Navigation

The app currently uses a small `activePage` state in `App.tsx` instead of a routing library. That keeps the first version easier to understand while there are only two pages:

- `metronome`
- `songs`
- `practice`

A router can be introduced later when the app needs shareable URLs, nested pages, or browser history behavior.

### `useMetronome`

The metronome logic lives in `src/metronome.ts` instead of directly inside `App.tsx`. This keeps the UI easier to read and gives the timing/audio behavior one clear home.

The hook exposes:

- `tempo`
- `rhythm`
- `currentBeat`
- `isPlaying`
- `setTempo`
- `setRhythm`
- `start`
- `stop`
- `toggle`

This is a common React pattern: components consume state and callbacks, while hooks own reusable side-effect logic.

### Songs Page

Each song is represented by:

- `id`
- `name`
- `bpm`
- `rhythmId`
- `structure`

The structure is an ordered list of sections. Each section has:

- `id`
- `name`
- `bars`

The create/edit form uses a `SongDraft` type instead of editing the saved `Song` object directly. This lets the user change form fields without mutating the saved song until they press **Save song**. On save, `songFromDraft` normalizes the data by trimming names, clamping BPM to the metronome range, rounding bar counts, and removing empty sections.

`App.tsx` owns the saved song state because both the song list and selected song detail need access to it. `SongsPage.tsx` receives songs and callbacks as props, which makes it easier to test and keeps data ownership clear.

The app initializes with demo songs if `localStorage` is empty. After that, each create/edit/delete operation updates React state, and an effect writes the latest song list into `localStorage`.

The section editor supports two structure-editing workflows:

- Hover or focus the gap between two sections to reveal a `+` button that inserts a new section at that exact position.
- Drag a section row to another row to reorder the structure. This uses native browser drag and drop instead of adding another dependency.
- Press `Enter` in a section's bars input to create a new section immediately after that row.

### Song Practice Playback

Songs can be started from the song detail view with the play button. Starting a song switches the app to a dedicated practice screen:

- The metronome runs at the song BPM.
- The metronome uses the song rhythm.
- The current sequence name is displayed very large in the center.
- The next sequence is displayed at the bottom.
- The visual beat dots continue to show the current beat within the bar.

Every song automatically starts with two count-in bars before the first saved section. These count-in bars are not stored in the song structure because they are playback behavior, not song data. The practice screen shows `Count in` during those two bars, then moves to the first section.

Section advancement is driven by completed bars. For example, if `Intro` is `4` bars in `4/4`, the app waits for four complete bars of four beats, then moves to the next section on the next downbeat.

The song player uses the same Web Audio scheduling approach as the standalone metronome: browser timers run only as a short lookahead loop, while the beeps themselves are scheduled against the audio context clock. This keeps the section updates aligned to the same scheduled beat times as the sound.

## Timing And Audio Logic

The metronome does not use a plain `setInterval` to play sounds directly. Browser timers can drift, especially when rendering work is happening. Instead, the app uses a scheduler:

- `setInterval` runs frequently as a lookahead loop.
- Each loop schedules upcoming Web Audio beeps slightly ahead of time.
- Web Audio plays those beeps at exact audio-context timestamps.

This pattern is more reliable for musical timing than firing sound directly from a timer callback.

The first beat of each bar uses a higher frequency (`1200Hz`) and slightly louder gain. The remaining beats use a lower frequency (`760Hz`). This makes the bar boundary easier to hear when practicing.

For rhythms like `6/8`, the app treats the lower number as the beat unit. That means eighth-note meters schedule beats faster than quarter-note meters at the same BPM, because each displayed beat is an eighth note.

## React Details Worth Studying

- `useState` stores values that affect rendering, such as tempo and selected rhythm.
- `useRef` stores mutable timing values that should not cause re-renders on every scheduler tick.
- `useEffect` keeps refs synchronized with state and cleans up timers when the component unmounts.
- `useCallback` keeps scheduler functions stable across renders.
- Derived rendering is used for the beat dots: the selected rhythm controls how many dots appear.

## Current Behavior

- Tempo range: `40` to `240` BPM.
- Rhythms: `4/4`, `3/4`, `5/4`, `6/8`, `7/8`, `12/8`.
- Play/pause transport.
- Accent beep on beat 1 of each bar.
- Lower beep on every other beat.
- Visual beat indicator synchronized to scheduled audio time.
- Song library page with saved songs.
- Create, edit, and delete songs.
- Each song stores a name, BPM, rhythm, and ordered song structure.
- Song structures display section names and bar counts.
- Song sections can be inserted between existing sections.
- Song sections can be reordered with drag and drop.
- Pressing `Enter` in a section bars input inserts the next section.
- Songs persist in browser `localStorage`.
- Song play button opens a full-screen practice view.
- Song playback includes two automatic count-in bars.
- Practice view advances to the next section after the configured number of full bars.
- When the final section finishes, the app automatically returns to the Songs page.

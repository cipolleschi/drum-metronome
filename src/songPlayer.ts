import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSecondsPerBeat,
  LOOKAHEAD_MS,
  playBeep,
  RHYTHMS,
  SCHEDULE_AHEAD_SECONDS,
  type Rhythm,
} from './metronome';
import type { Song } from './songs';

type SongPlaybackState = {
  song: Song | null;
  rhythm: Rhythm | null;
  currentSectionIndex: number;
  currentBeat: number;
  currentBarInSection: number;
  isCountIn: boolean;
  isPlaying: boolean;
  isComplete: boolean;
};

type UseSongPlayerResult = SongPlaybackState & {
  startSong: (song: Song) => Promise<void>;
  stopSong: () => void;
};

const initialState: SongPlaybackState = {
  song: null,
  rhythm: null,
  currentSectionIndex: 0,
  currentBeat: 0,
  currentBarInSection: 1,
  isCountIn: false,
  isPlaying: false,
  isComplete: false,
};

export const COUNT_IN_BARS = 2;

export function useSongPlayer(): UseSongPlayerResult {
  const [state, setState] = useState<SongPlaybackState>(initialState);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const uiTimeoutsRef = useRef<number[]>([]);
  const songRef = useRef<Song | null>(null);
  const rhythmRef = useRef<Rhythm | null>(null);
  const nextBeatTimeRef = useRef(0);
  const beatIndexRef = useRef(0);
  const sectionIndexRef = useRef(0);
  const barInSectionRef = useRef(1);
  const isCountInRef = useRef(false);
  const countInBarRef = useRef(1);
  const isCompleteRef = useRef(false);

  const clearUiTimeouts = useCallback(() => {
    uiTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    uiTimeoutsRef.current = [];
  }, []);

  const stopSong = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    clearUiTimeouts();
    isCompleteRef.current = true;
    setState((current) => ({
      ...current,
      isPlaying: false,
    }));
  }, [clearUiTimeouts]);

  const scheduleUiUpdate = useCallback((time: number, nextState: Partial<SongPlaybackState>) => {
    const audioContext = audioContextRef.current;

    if (!audioContext) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        ...nextState,
      }));
    }, Math.max(0, (time - audioContext.currentTime) * 1000));

    uiTimeoutsRef.current.push(timeoutId);
  }, []);

  const scheduleFinish = useCallback(
    (time: number) => {
      const audioContext = audioContextRef.current;

      if (!audioContext) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setState((current) => ({
          ...current,
          currentBeat: 0,
          isPlaying: false,
          isComplete: true,
        }));
      }, Math.max(0, (time - audioContext.currentTime) * 1000));

      uiTimeoutsRef.current.push(timeoutId);
    },
    [],
  );

  const advancePosition = useCallback((song: Song, rhythm: Rhythm, scheduledBeat: number, scheduledTime: number) => {
    if (scheduledBeat !== rhythm.beatsPerBar - 1) {
      beatIndexRef.current = scheduledBeat + 1;
      return;
    }

    beatIndexRef.current = 0;

    if (isCountInRef.current) {
      countInBarRef.current += 1;

      if (countInBarRef.current > COUNT_IN_BARS) {
        isCountInRef.current = false;
        countInBarRef.current = 1;
        sectionIndexRef.current = 0;
        barInSectionRef.current = 1;
      }

      return;
    }

    barInSectionRef.current += 1;

    const activeSection = song.structure[sectionIndexRef.current];

    if (activeSection && barInSectionRef.current <= activeSection.bars) {
      return;
    }

    sectionIndexRef.current += 1;
    barInSectionRef.current = 1;

    if (sectionIndexRef.current >= song.structure.length) {
      isCompleteRef.current = true;
      scheduleFinish(scheduledTime + getSecondsPerBeat(song.bpm, rhythm.beatUnit));
    }
  }, [scheduleFinish]);

  const scheduleBeat = useCallback(
    (time: number) => {
      const audioContext = audioContextRef.current;
      const song = songRef.current;
      const rhythm = rhythmRef.current;

      if (!audioContext || !song || !rhythm || isCompleteRef.current) {
        return;
      }

      const scheduledBeat = beatIndexRef.current;
      const scheduledSectionIndex = sectionIndexRef.current;
      const scheduledBarInSection = isCountInRef.current ? countInBarRef.current : barInSectionRef.current;
      const scheduledIsCountIn = isCountInRef.current;

      playBeep(audioContext, time, scheduledBeat === 0);
      scheduleUiUpdate(time, {
        currentBeat: scheduledBeat,
        currentSectionIndex: scheduledSectionIndex,
        currentBarInSection: scheduledBarInSection,
        isCountIn: scheduledIsCountIn,
      });

      nextBeatTimeRef.current += getSecondsPerBeat(song.bpm, rhythm.beatUnit);
      advancePosition(song, rhythm, scheduledBeat, time);
    },
    [advancePosition, scheduleUiUpdate],
  );

  const scheduler = useCallback(() => {
    const audioContext = audioContextRef.current;

    if (!audioContext || isCompleteRef.current) {
      return;
    }

    while (nextBeatTimeRef.current < audioContext.currentTime + SCHEDULE_AHEAD_SECONDS && !isCompleteRef.current) {
      scheduleBeat(nextBeatTimeRef.current);
    }
  }, [scheduleBeat]);

  const startSong = useCallback(
    async (song: Song) => {
      const rhythm = RHYTHMS.find((candidate) => candidate.id === song.rhythmId) ?? RHYTHMS[0];

      stopSong();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current ??= new AudioContextClass();

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      songRef.current = song;
      rhythmRef.current = rhythm;
      beatIndexRef.current = 0;
      sectionIndexRef.current = 0;
      barInSectionRef.current = 1;
      isCountInRef.current = true;
      countInBarRef.current = 1;
      isCompleteRef.current = false;
      nextBeatTimeRef.current = audioContextRef.current.currentTime + 0.05;

      setState({
        song,
        rhythm,
        currentSectionIndex: 0,
        currentBeat: 0,
        currentBarInSection: 1,
        isCountIn: true,
        isPlaying: true,
        isComplete: false,
      });

      timerRef.current = window.setInterval(scheduler, LOOKAHEAD_MS);
      scheduler();
    },
    [scheduler, stopSong],
  );

  useEffect(() => stopSong, [stopSong]);

  return {
    ...state,
    startSong,
    stopSong,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

export type Rhythm = {
  id: string;
  label: string;
  beatsPerBar: number;
  beatUnit: number;
};

export const RHYTHMS: Rhythm[] = [
  { id: '4-4', label: '4/4', beatsPerBar: 4, beatUnit: 4 },
  { id: '3-4', label: '3/4', beatsPerBar: 3, beatUnit: 4 },
  { id: '5-4', label: '5/4', beatsPerBar: 5, beatUnit: 4 },
  { id: '6-8', label: '6/8', beatsPerBar: 6, beatUnit: 8 },
  { id: '7-8', label: '7/8', beatsPerBar: 7, beatUnit: 8 },
  { id: '12-8', label: '12/8', beatsPerBar: 12, beatUnit: 8 },
];

const MIN_TEMPO = 40;
const MAX_TEMPO = 240;
export const LOOKAHEAD_MS = 25;
export const SCHEDULE_AHEAD_SECONDS = 0.1;
const BEEP_SECONDS = 0.045;

type UseMetronomeResult = {
  tempo: number;
  rhythm: Rhythm;
  currentBeat: number;
  isPlaying: boolean;
  setTempo: (tempo: number) => void;
  setRhythm: (rhythmId: string) => void;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

const clampTempo = (tempo: number) => Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, tempo));

export const getSecondsPerBeat = (tempo: number, beatUnit: number) => {
  const quarterNoteSeconds = 60 / tempo;
  return quarterNoteSeconds * (4 / beatUnit);
};

export const playBeep = (audioContext: AudioContext, time: number, isAccent: boolean) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(isAccent ? 1200 : 760, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(isAccent ? 0.5 : 0.32, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + BEEP_SECONDS);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + BEEP_SECONDS);
};

export function useMetronome(): UseMetronomeResult {
  const [tempo, setTempoState] = useState(100);
  const [rhythm, setRhythmState] = useState(RHYTHMS[0]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextBeatTimeRef = useRef(0);
  const beatIndexRef = useRef(0);
  const tempoRef = useRef(tempo);
  const rhythmRef = useRef(rhythm);

  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    rhythmRef.current = rhythm;
  }, [rhythm]);

  const scheduleBeat = useCallback((beatIndex: number, time: number) => {
    const audioContext = audioContextRef.current;
    const activeRhythm = rhythmRef.current;

    if (!audioContext) {
      return;
    }

    playBeep(audioContext, time, beatIndex === 0);
    window.setTimeout(() => {
      setCurrentBeat(beatIndex);
    }, Math.max(0, (time - audioContext.currentTime) * 1000));

    beatIndexRef.current = (beatIndex + 1) % activeRhythm.beatsPerBar;
    nextBeatTimeRef.current += getSecondsPerBeat(tempoRef.current, activeRhythm.beatUnit);
  }, []);

  const scheduler = useCallback(() => {
    const audioContext = audioContextRef.current;

    if (!audioContext) {
      return;
    }

    while (nextBeatTimeRef.current < audioContext.currentTime + SCHEDULE_AHEAD_SECONDS) {
      scheduleBeat(beatIndexRef.current, nextBeatTimeRef.current);
    }
  }, [scheduleBeat]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsPlaying(false);
    beatIndexRef.current = 0;
    setCurrentBeat(0);
  }, []);

  const start = useCallback(async () => {
    if (timerRef.current !== null) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current ??= new AudioContextClass();

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    beatIndexRef.current = 0;
    nextBeatTimeRef.current = audioContextRef.current.currentTime + 0.05;
    setIsPlaying(true);
    timerRef.current = window.setInterval(scheduler, LOOKAHEAD_MS);
    scheduler();
  }, [scheduler]);

  const setTempo = useCallback((nextTempo: number) => {
    setTempoState(clampTempo(Math.round(nextTempo)));
  }, []);

  const setRhythm = useCallback((rhythmId: string) => {
    const nextRhythm = RHYTHMS.find((candidate) => candidate.id === rhythmId);

    if (nextRhythm) {
      beatIndexRef.current = 0;
      setCurrentBeat(0);
      setRhythmState(nextRhythm);
    }
  }, []);

  const toggle = useCallback(() => {
    if (timerRef.current === null) {
      void start();
      return;
    }

    stop();
  }, [start, stop]);

  useEffect(() => stop, [stop]);

  return {
    tempo,
    rhythm,
    currentBeat,
    isPlaying,
    setTempo,
    setRhythm,
    start,
    stop,
    toggle,
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

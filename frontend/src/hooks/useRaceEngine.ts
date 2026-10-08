import { useCallback, useEffect, useRef, useState } from "react";
import type { WordData, TypingStats } from "../types";
import { calculateStats } from "../lib/metrics";

function buildFromText(text: string): WordData[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({
      chars: w.split("").map((c) => ({ char: c, state: "pending" as const })),
    }));
}

interface Options {
  text: string | null;
  enabled: boolean; // false até o race_start chegar
  onProgress?: (word: number, char: number, wpm: number) => void;
  onFinish?: (stats: TypingStats) => void;
}

export function useRaceEngine({ text, enabled, onProgress, onFinish }: Options) {
  const [words, setWords] = useState<WordData[]>([]);
  const [currentWord, setCurrentWord] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<TypingStats | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const wpmSamplesRef = useRef<number[]>([]);
  const lastSampleRef = useRef(0);
  const finishedRef = useRef(false);

  // Quando o texto chega → constrói
  useEffect(() => {
    if (text) {
      setWords(buildFromText(text));
      setCurrentWord(0);
      setCurrentChar(0);
      setStarted(false);
      setFinished(false);
      setStats(null);
      startTimeRef.current = null;
      correctCharsRef.current = 0;
      incorrectCharsRef.current = 0;
      wpmSamplesRef.current = [];
      lastSampleRef.current = 0;
      finishedRef.current = false;
    }
  }, [text]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const elapsedSec = startTimeRef.current
      ? (performance.now() - startTimeRef.current) / 1000
      : 0;

    const s = calculateStats(
      correctCharsRef.current,
      incorrectCharsRef.current,
      elapsedSec,
      wpmSamplesRef.current
    );
    setStats(s);
    setFinished(true);
    onFinish?.(s);
  }, [onFinish]);

  const handleKey = useCallback(
    (key: string) => {
      if (!enabled || finished) return;

      // Primeira tecla → arranca
      if (!startTimeRef.current && key.length === 1) {
        startTimeRef.current = performance.now();
        lastSampleRef.current = performance.now();
        setStarted(true);
      }

      if (!startTimeRef.current) return;

      // Amostra de WPM por segundo
      const now = performance.now();
      if (now - lastSampleRef.current >= 1000) {
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const wpm = (correctCharsRef.current / 5 / elapsedSec) * 60;
        wpmSamplesRef.current.push(wpm);
        lastSampleRef.current = now;
      }

      const word = words[currentWord];
      if (!word) return;

      if (key === " ") {
        if (currentChar === 0) return;
        const newWord = currentWord + 1;
        setCurrentWord(newWord);
        setCurrentChar(0);

        // Callback de progresso
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const wpm = elapsedSec > 0 ? (correctCharsRef.current / 5 / elapsedSec) * 60 : 0;
        onProgress?.(newWord, 0, wpm);

        // Fim
        if (newWord >= words.length) {
          finish();
        }
        return;
      }

      if (key === "Backspace") {
        if (currentChar > 0) {
          setCurrentChar((c) => c - 1);
          const ch = word.chars[currentChar - 1];
          if (ch.state === "correct") correctCharsRef.current--;
          if (ch.state === "incorrect") incorrectCharsRef.current--;
          ch.state = "pending";
          setWords([...words]);
        }
        return;
      }

      if (key.length !== 1) return;

      const expected = word.chars[currentChar];
      if (!expected) {
        word.chars.push({ char: key, state: "extra" });
        incorrectCharsRef.current++;
        setWords([...words]);
        setCurrentChar((c) => c + 1);
        return;
      }

      if (key === expected.char) {
        expected.state = "correct";
        correctCharsRef.current++;
      } else {
        expected.state = "incorrect";
        incorrectCharsRef.current++;
      }

      setWords([...words]);
      const newChar = currentChar + 1;
      setCurrentChar(newChar);

      // Progresso por caractere (opcional, mas útil)
      const elapsedSec = startTimeRef.current
        ? (now - startTimeRef.current) / 1000
        : 0;
      const wpm = elapsedSec > 0 ? (correctCharsRef.current / 5 / elapsedSec) * 60 : 0;
      onProgress?.(currentWord, newChar, wpm);
    },
    [words, currentWord, currentChar, enabled, finished, finish, onProgress]
  );

  // Listener de teclas
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Tab" || e.key === "Escape") return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleKey]);

  return {
    words,
    currentWord,
    currentChar,
    started,
    finished,
    stats,
  };
}
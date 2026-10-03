import { useCallback, useEffect, useRef, useState } from "react";
import { generateWords } from "../lib/words";
import { calculateStats } from "../lib/metrics";
import type { WordData, TypingStats } from "../types";

const WORD_COUNT = 30;

function buildWords(words: string[]): WordData[] {
  return words.map((w) => ({
    chars: w.split("").map((c) => ({ char: c, state: "pending" as const })),
  }));
}

export function useTypingEngine() {
  const [words, setWords] = useState<WordData[]>(() =>
    buildWords(generateWords(WORD_COUNT))
  );
  const [currentWord, setCurrentWord] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<TypingStats | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const wpmSamplesRef = useRef<number[]>([]);
  const lastSampleRef = useRef<number>(0);

  const reset = useCallback(() => {
    setWords(buildWords(generateWords(WORD_COUNT)));
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
  }, []);

  const finish = useCallback(() => {
    const elapsed = startTimeRef.current
      ? (performance.now() - startTimeRef.current) / 1000
      : 0;
    const s = calculateStats(
      correctCharsRef.current,
      incorrectCharsRef.current,
      elapsed,
      wpmSamplesRef.current
    );
    setStats(s);
    setFinished(true);
  }, []);

  const handleKey = useCallback(
    (key: string) => {
      if (finished) return;

      if (!started && key.length === 1) {
        setStarted(true);
        startTimeRef.current = performance.now();
        lastSampleRef.current = performance.now();
      }

      if (!started) return;

      // Amostra de WPM por segundo (para consistência)
      const now = performance.now();
      if (now - lastSampleRef.current >= 1000) {
        const elapsed = (now - startTimeRef.current!) / 1000;
        const wpm = (correctCharsRef.current / 5 / elapsed) * 60;
        wpmSamplesRef.current.push(wpm);
        lastSampleRef.current = now;
      }

      const word = words[currentWord];
      if (!word) return;

      if (key === " ") {
        // Avança palavra
        if (currentChar === 0) return;
        // Marca chars pendentes como corretos? Não — só avança
        setCurrentWord((w) => w + 1);
        setCurrentChar(0);
        if (currentWord === words.length - 1) {
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
        }
        return;
      }

      if (key.length !== 1) return;

      const expected = word.chars[currentChar];
      if (!expected) {
        // Extra chars além do tamanho da palavra
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
      setCurrentChar((c) => c + 1);
    },
    [words, currentWord, currentChar, started, finished, finish]
  );

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        reset();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleKey, reset]);

  return { words, currentWord, currentChar, started, finished, stats, reset };
}
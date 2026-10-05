import { useCallback, useEffect, useRef, useState } from "react";
import { generateWords } from "../lib/words";
import { getRandomQuote } from "../lib/quotes";
import { getRandomSnippet } from "../lib/code";
import { calculateStats } from "../lib/metrics";
import { useConfig } from "../store/config";
import { saveResult } from "../lib/storage";
import type { WordData, TypingStats } from "../types";

function buildWords(words: string[]): WordData[] {
  return words.map((w) => ({
    chars: w.split("").map((c) => ({ char: c, state: "pending" as const })),
  }));
}

function buildFromText(text: string): WordData[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({
      chars: w.split("").map((c) => ({ char: c, state: "pending" as const })),
    }));
}

export function useTypingEngine() {
  const { config } = useConfig();
  const wordCount = config.mode === "words" ? config.wordCount : 120;

  const [words, setWords] = useState<WordData[]>(() =>
    buildWords(generateWords(wordCount))
  );
  const [currentWord, setCurrentWord] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState<TypingStats | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const wpmSamplesRef = useRef<number[]>([]);
  const lastSampleRef = useRef(0);
  const finishedRef = useRef(false);

  // Reset total — chamado no início e quando a config muda
  const reset = useCallback(() => {
    finishedRef.current = false;

    let newWords: WordData[];

    if (config.source === "quote") {
      const q = getRandomQuote(config.language);
      newWords = buildFromText(q.text);
    } else if (config.source === "code") {
      const s = getRandomSnippet();
      newWords = buildFromText(s.text);
    } else if (config.source === "custom" && config.customText) {
      newWords = buildFromText(config.customText);
    } else {
      newWords = buildWords(
        generateWords(wordCount, {
          language: config.language,
          punctuation: config.punctuation,
          numbers: config.numbers,
        })
      );
    }

    setWords(newWords);
    setCurrentWord(0);
    setCurrentChar(0);
    setStarted(false);
    setFinished(false);
    setStats(null);
    setElapsed(0);
    startTimeRef.current = null;
    correctCharsRef.current = 0;
    incorrectCharsRef.current = 0;
    wpmSamplesRef.current = [];
    lastSampleRef.current = 0;
  }, [
    wordCount,
    config.language,
    config.punctuation,
    config.numbers,
    config.source,
    config.customText,
  ]);

  // Reset sempre que a config muda
  useEffect(() => {
    reset();
  }, [reset]);

  // Finalizar teste
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
    saveResult(s, config);
  }, [config]);

  // Timer (modo tempo)
  useEffect(() => {
    if (!started || finished) return;
    if (config.mode !== "time") return;

    const interval = setInterval(() => {
      if (!startTimeRef.current) return;
      const sec = (performance.now() - startTimeRef.current) / 1000;
      setElapsed(sec);
      if (sec >= config.time) {
        finish();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [started, finished, config.mode, config.time, finish]);

  // Lógica de uma tecla/caractere
  const handleKey = useCallback(
    (key: string) => {
      if (finished) return;

      if (!started && key.length === 1) {
        setStarted(true);
        startTimeRef.current = performance.now();
        lastSampleRef.current = performance.now();
      }

      if (!started && key !== "Backspace") return;
      if (!started) return;

      // Amostra de WPM por segundo
      const now = performance.now();
      if (now - lastSampleRef.current >= 1000 && startTimeRef.current) {
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const wpm = (correctCharsRef.current / 5 / elapsedSec) * 60;
        wpmSamplesRef.current.push(wpm);
        lastSampleRef.current = now;
      }

      const word = words[currentWord];
      if (!word) return;

      // Espaço → próxima palavra
      if (key === " ") {
        if (currentChar === 0) return;
        setCurrentWord((w) => w + 1);
        setCurrentChar(0);
        if (currentWord === words.length - 1) {
          finish();
        }
        return;
      }

      // Backspace
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

      // Extra chars (além do tamanho da palavra)
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
      setCurrentChar((c) => c + 1);
    },
    [words, currentWord, currentChar, started, finished, finish]
  );

  // Handler para desktop (keydown global)
  const handleKeyDownWindow = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        reset();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        reset();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handleKey(e.key);
    },
    [handleKey, reset]
  );

  // Handler para o input escondido (mobile)
  const handleInput = useCallback(
    (value: string) => {
      for (const char of value) {
        handleKey(char);
      }
    },
    [handleKey]
  );

  const handleKeyDownInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("Backspace");
      }
    },
    [handleKey]
  );

  // Listener global (desktop) — ignora se for touch
  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;

    if (isTouch) return;

    window.addEventListener("keydown", handleKeyDownWindow);
    return () => window.removeEventListener("keydown", handleKeyDownWindow);
  }, [handleKeyDownWindow]);

  return {
    words,
    currentWord,
    currentChar,
    started,
    finished,
    stats,
    reset,
    elapsed,
    timeLeft:
      config.mode === "time" ? Math.max(0, config.time - elapsed) : null,
    handleInput,
    handleKeyDownInput,
  };
}
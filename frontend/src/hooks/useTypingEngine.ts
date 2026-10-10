import { useCallback, useEffect, useRef, useState } from "react";
import { generateWords } from "../lib/words";
import { getRandomQuote } from "../lib/quotes";
import { getRandomSnippet } from "../lib/code";
import { calculateStats } from "../lib/metrics";
import { useConfig } from "../store/config";
import { saveResult } from "../lib/storage";
import type { WordData, TypingStats } from "../types";
import { useAuth } from "../store/auth";
import { resultsApi } from "../lib/api";



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
  const wordCount = config.mode === "words" ? config.wordCount : 50;




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
  const lastExtensionWordRef = useRef(-1);


  const { user } = useAuth();

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

    // Sempre guarda local
    saveResult(s, config);

    // Se logado, envia ao servidor (fire-and-forget)
    if (user) {
      resultsApi
        .create({
          wpm: s.wpm,
          raw: s.raw,
          accuracy: s.accuracy,
          consistency: s.consistency,
          correct_chars: s.correctChars,
          incorrect_chars: s.incorrectChars,
          total_chars: s.totalChars,
          time_seconds: s.timeSeconds,
          mode: config.mode,
          source: config.source,
          duration: config.mode === "time" ? config.time : config.wordCount,
          punctuation: config.punctuation,
          numbers: config.numbers,
          language: config.language,
        })
        .catch((e) => console.error("Erro ao enviar resultado:", e));
    }
  }, [config, user]);

  // Reset total
  const reset = useCallback(() => {
    finishedRef.current = false;
    lastExtensionWordRef.current = -1;

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

  useEffect(() => {
    reset();
  }, [reset]);


  // const finish = useCallback(() => {
  //   if (finishedRef.current) return;
  //   finishedRef.current = true;

  //   const elapsedSec = startTimeRef.current
  //     ? (performance.now() - startTimeRef.current) / 1000
  //     : 0;

  //   const s = calculateStats(
  //     correctCharsRef.current,
  //     incorrectCharsRef.current,
  //     elapsedSec,
  //     wpmSamplesRef.current
  //   );
  //   setStats(s);
  //   setFinished(true);
  //   saveResult(s, config);
  // }, [config]);

  
  
  
  
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

  // Em modo tempo, mantém texto suficiente à frente do cursor.
  // Depende do índice da palavra, para gerar apenas ao avançar, sem loop
  // quando o array de palavras é ampliado.
  useEffect(() => {
    if (config.mode !== "time" || finishedRef.current) return;
    if (currentWord < words.length - 15) return;
    if (lastExtensionWordRef.current === currentWord) return;

    lastExtensionWordRef.current = currentWord;

    let moreWords: WordData[];
    if (config.source === "quote") {
      moreWords = buildFromText(getRandomQuote(config.language).text);
    } else if (config.source === "code") {
      moreWords = buildFromText(getRandomSnippet().text);
    } else if (config.source === "custom" && config.customText) {
      moreWords = buildFromText(config.customText);
    } else {
      moreWords = buildWords(generateWords(30, {
        language: config.language,
        punctuation: config.punctuation,
        numbers: config.numbers,
      }));
    }

    if (moreWords.length > 0) {
      setWords((previous) => [...previous, ...moreWords]);
    }
  }, [
    currentWord,
    words.length,
    config.mode,
    config.source,
    config.language,
    config.punctuation,
    config.numbers,
    config.customText,
  ]);


  const handleKey = useCallback(
    (key: string) => {
      if (finished) return;

      // Primeira tecla válida: arranca o teste (síncrono via ref)
      if (!startTimeRef.current && key.length === 1) {
        startTimeRef.current = performance.now();
        lastSampleRef.current = performance.now();
        setStarted(true);
      }

      // Sem tempo inicial → ignora (ex: backspace antes de começar)
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

      // Espaço → próxima palavra
      if (key === " ") {
        if (currentChar === 0) return;

        const isLastWord = currentWord === words.length - 1;
        setCurrentWord((wordIndex) => wordIndex + 1);
        setCurrentChar(0);

        if (config.mode === "words" && isLastWord) {
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
    [words, currentWord, currentChar, finished, finish, config.mode, config.source, config.language, config.punctuation, config.numbers, config.customText]
  );

  const handleKeyDownWindow = useCallback(
    (e: KeyboardEvent) => {
      // Quando o input oculto está focado, os caracteres chegam por onInput.
      // Ignorar o keydown aqui evita processar cada tecla duas vezes.
      const isTypingInput = e.target instanceof HTMLInputElement;
      const isResetShortcut =
        e.key === "Tab" ||
        e.key === "Escape" ||
        ((e.metaKey || e.ctrlKey) && e.key === "Enter");
      if (isTypingInput && !isResetShortcut) return;

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

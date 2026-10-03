export type CharState = "pending" | "correct" | "incorrect" | "extra";
export type TestMode = "time" | "words";
export type Language = "pt" | "en";

export interface CharData {
  char: string;
  state: CharState;
}

export interface WordData {
  chars: CharData[];
}

export interface TypingStats {
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  timeSeconds: number;
}





export interface TestConfig {
  mode: TestMode;
  time: number; // 15 | 30 | 60 | 120
  wordCount: number; // 10 | 25 | 50 | 100
  punctuation: boolean;
  numbers: boolean;
  language: Language;
}

export const DEFAULT_CONFIG: TestConfig = {
  mode: "time",
  time: 30,
  wordCount: 25,
  punctuation: false,
  numbers: false,
  language: "pt",
};

// Tipos existentes (CharState, CharData, WordData, TypingStats) mantêm-se
export interface TestResult {
  id: string;
  timestamp: number;
  stats: TypingStats;
  config: TestConfig;
}
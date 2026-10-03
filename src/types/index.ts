export type CharState = "pending" | "correct" | "incorrect" | "extra";

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
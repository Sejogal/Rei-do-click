import type { TypingStats } from "../types";

export function calculateStats(
  correctChars: number,
  incorrectChars: number,
  timeSeconds: number,
  samplesWpm: number[] = []
): TypingStats {
  const totalChars = correctChars + incorrectChars;
  const minutes = timeSeconds / 60;
  const wpm = minutes > 0 ? correctChars / 5 / minutes : 0;
  const raw = minutes > 0 ? totalChars / 5 / minutes : 0;
  const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 100;

  // Consistência: desvio padrão das amostras de WPM
  let consistency = 100;
  if (samplesWpm.length > 1) {
    const mean = samplesWpm.reduce((a, b) => a + b, 0) / samplesWpm.length;
    const variance =
      samplesWpm.reduce((a, b) => a + (b - mean) ** 2, 0) / samplesWpm.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;
    consistency = Math.max(0, (1 - cv) * 100);
  }

  return {
    wpm: Math.round(wpm),
    raw: Math.round(raw),
    accuracy: Math.round(accuracy * 10) / 10,
    consistency: Math.round(consistency),
    correctChars,
    incorrectChars,
    totalChars,
    timeSeconds,
  };
}
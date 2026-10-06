import type { TypingStats, TestConfig, TestResult } from "../types";

const KEY = "typearena-results";
const MAX = 200;

export function getResults(): TestResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveResult(stats: TypingStats, config: TestConfig) {
  const results = getResults();
  const result: TestResult = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    stats,
    config,
  };
  results.unshift(result);
  if (results.length > MAX) results.length = MAX;
  localStorage.setItem(KEY, JSON.stringify(results));
}

export function clearResults() {
  localStorage.removeItem(KEY);
}

export function getAggregate() {
  const results = getResults();
  if (results.length === 0) {
    return { count: 0, bestWpm: 0, avgWpm: 0, avgAccuracy: 0, avgConsistency: 0, totalTime: 0 };
  }

  const bestWpm = Math.max(...results.map((r) => r.stats.wpm));
  const avgWpm = Math.round(
    results.reduce((a, r) => a + r.stats.wpm, 0) / results.length
  );
  const avgAccuracy =
    Math.round(
      (results.reduce((a, r) => a + r.stats.accuracy, 0) / results.length) * 10
    ) / 10;
  const avgConsistency = Math.round(
    results.reduce((a, r) => a + r.stats.consistency, 0) / results.length
  );
  const totalTime = Math.round(
    results.reduce((a, r) => a + r.stats.timeSeconds, 0)
  );

  return { count: results.length, bestWpm, avgWpm, avgAccuracy, avgConsistency, totalTime };
}

export interface LocalResult {
  id: string;
  timestamp: number;
  stats: TypingStats;
  config: TestConfig;
}
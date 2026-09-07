import type { ScoreBreakdown, ScoreHistory } from '../types';

const KEY = 'memory-train-score-history';

export function loadScoreHistory(): ScoreHistory {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { latest: null, history: [] };
    const parsed = JSON.parse(raw) as ScoreHistory;
    return {
      latest: parsed.latest ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { latest: null, history: [] };
  }
}

export function saveScore(score: ScoreBreakdown): ScoreHistory {
  const current = loadScoreHistory();
  const next: ScoreHistory = {
    latest: score,
    history: [score, ...current.history].slice(0, 50),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearScoreHistory(): void {
  localStorage.removeItem(KEY);
}

export function formatScoreDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

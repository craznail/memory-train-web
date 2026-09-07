import { PAPERS } from '../data/papers';

export interface DailyRound {
  paperId: string;
  withInterference: boolean;
  done: boolean;
}

export interface DailyPlan {
  date: string;
  rounds: DailyRound[];
  /** Index of the next round to play (0..rounds.length) */
  currentIndex: number;
  completed: boolean;
}

const PREFIX = 'memory-train-daily-';

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function storageKey(date: string): string {
  return `${PREFIX}${date}`;
}

/** Build a 3-round plan: shuffle papers, ensure ≥1 with interference */
export function buildDailyPlan(date: string): DailyPlan {
  const shuffled = [...PAPERS].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3);
  while (picked.length < 3) {
    picked.push(PAPERS[picked.length % PAPERS.length]);
  }
  const rounds: DailyRound[] = picked.map((p, i) => ({
    paperId: p.id,
    // At least first or a random one has interference; force index 0 true, others follow paper flag or false
    withInterference: i === 0 ? true : Boolean(p.withInterference && i === 1),
    done: false,
  }));
  // Ensure at least one withInterference
  if (!rounds.some((r) => r.withInterference)) {
    rounds[0].withInterference = true;
  }
  return {
    date,
    rounds,
    currentIndex: 0,
    completed: false,
  };
}

export function loadOrCreateDailyPlan(): DailyPlan {
  const date = localDateKey();
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (raw) {
      const parsed = JSON.parse(raw) as DailyPlan;
      if (parsed.date === date && Array.isArray(parsed.rounds) && parsed.rounds.length === 3) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  const plan = buildDailyPlan(date);
  saveDailyPlan(plan);
  return plan;
}

export function saveDailyPlan(plan: DailyPlan): void {
  localStorage.setItem(storageKey(plan.date), JSON.stringify(plan));
}

export function markRoundDone(plan: DailyPlan, index: number): DailyPlan {
  const rounds = plan.rounds.map((r, i) =>
    i === index ? { ...r, done: true } : r,
  );
  const nextIndex = Math.min(index + 1, rounds.length);
  const completed = rounds.every((r) => r.done);
  const next: DailyPlan = {
    ...plan,
    rounds,
    currentIndex: completed ? rounds.length : nextIndex,
    completed,
  };
  saveDailyPlan(next);
  return next;
}

/** Same-day retry: reset done flags, keep paper assignment */
export function resetDailyPlanForRetry(plan: DailyPlan): DailyPlan {
  const next: DailyPlan = {
    ...plan,
    rounds: plan.rounds.map((r) => ({ ...r, done: false })),
    currentIndex: 0,
    completed: false,
  };
  saveDailyPlan(next);
  return next;
}

export function dailyProgressLabel(plan: DailyPlan): string {
  const done = plan.rounds.filter((r) => r.done).length;
  if (plan.completed) return `今日已完成 ${done}/3 · 可重练`;
  return `今日进度 ${done}/3 · 约10～15分钟`;
}

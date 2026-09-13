/** Mid-listen coach tips — method rhythm only, never spoil answers */

export const COACH_TIPS = [
  '先听人物',
  '抓住时间词',
  '地点出现了吗',
  '任务顺序',
  '有没有数字',
] as const;

const KEY = 'coachEnabled';

export function loadCoachEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return true;
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

export function saveCoachEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Estimate listen duration (ms) from Chinese passage length */
export function estimateDurationMs(text: string): number {
  const chars = text.replace(/\s/g, '').length;
  const sec = Math.max(12, chars / 3.8);
  return Math.round(sec * 1000);
}

/** Pick tip index for progress 0..1 across 5 slices */
export function tipIndexForProgress(progress: number, tipCount = COACH_TIPS.length): number {
  const p = Math.max(0, Math.min(0.999, progress));
  return Math.min(tipCount - 1, Math.floor(p * tipCount));
}

export function tipForProgress(progress: number): string {
  return COACH_TIPS[tipIndexForProgress(progress)];
}

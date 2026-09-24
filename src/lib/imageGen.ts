/** BYOK OpenAI-compatible image generation + local quotas (localStorage only). */

import { prefabImageUrl } from '../data/associationStudio';

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
/** Model is not exposed in Settings UI; kept as a constant. */
export const DEFAULT_MODEL = 'gpt-image-1';
export const DAILY_LIMIT = 20;
/** Max 「换一张」 clicks per association sentence. */
export const MAX_SWAPS_PER_SENTENCE = 3;
export const IMAGE_SIZE = '1024x1024';

export const STYLE_SUFFIX =
  '，扁平插画风格，明亮配色，画面中不要出现任何文字。Flat illustration, bright colors, no text.';

const PREFS_KEY = 'mt-image-gen-prefs';
const DAILY_KEY = 'mt-image-gen-daily';

export interface ImageGenPrefs {
  baseUrl: string;
  apiKey: string;
}

export interface DailyUsage {
  date: string;
  count: number;
}

export type FallbackReason = 'no_key' | 'daily_limit' | 'error';

export type GenerateOutcome =
  | { kind: 'api'; url: string }
  | { kind: 'fallback'; url: string; reason: FallbackReason };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Local calendar date YYYY-MM-DD (unit-testable via injected Date). */
export function localDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadImageGenPrefs(storage: StorageLike | null = defaultStorage()): ImageGenPrefs {
  const empty: ImageGenPrefs = { baseUrl: DEFAULT_BASE_URL, apiKey: '' };
  if (!storage) return empty;
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<ImageGenPrefs>;
    return {
      baseUrl: (parsed.baseUrl || DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
    };
  } catch {
    return empty;
  }
}

export function saveImageGenPrefs(
  prefs: ImageGenPrefs,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  const next: ImageGenPrefs = {
    baseUrl: prefs.baseUrl.trim() || DEFAULT_BASE_URL,
    apiKey: prefs.apiKey,
  };
  storage.setItem(PREFS_KEY, JSON.stringify(next));
}

export function clearImageGenPrefs(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  storage.removeItem(PREFS_KEY);
}

export function isConfigured(prefs: ImageGenPrefs = loadImageGenPrefs()): boolean {
  return prefs.apiKey.trim().length > 0;
}

export function loadDailyUsage(
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
): DailyUsage {
  const today = localDateKey(now);
  if (!storage) return { date: today, count: 0 };
  try {
    const raw = storage.getItem(DAILY_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as Partial<DailyUsage>;
    if (parsed.date !== today) return { date: today, count: 0 };
    const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : 0;
    return { date: today, count };
  } catch {
    return { date: today, count: 0 };
  }
}

export function getDailyCount(
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
): number {
  return loadDailyUsage(storage, now).count;
}

export function remainingDailyQuota(
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
  limit: number = DAILY_LIMIT,
): number {
  return Math.max(0, limit - getDailyCount(storage, now));
}

export function canGenerateToday(
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
  limit: number = DAILY_LIMIT,
): boolean {
  return remainingDailyQuota(storage, now, limit) > 0;
}

/** Pure: whether another 「换一张」 is allowed for this sentence. */
export function canSwap(swapCount: number, max: number = MAX_SWAPS_PER_SENTENCE): boolean {
  return swapCount < max;
}

export function recordGeneration(
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
): DailyUsage {
  const today = localDateKey(now);
  const current = loadDailyUsage(storage, now);
  const next: DailyUsage = {
    date: today,
    count: current.date === today ? current.count + 1 : 1,
  };
  if (storage) {
    storage.setItem(DAILY_KEY, JSON.stringify(next));
  }
  return next;
}

export function buildPrompt(sentence: string): string {
  return `${sentence.trim()}${STYLE_SUFFIX}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL;
}

function fallbackUrl(seed: string): string {
  return prefabImageUrl(seed.slice(0, 48) || 'assoc');
}

interface ApiImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
}

/**
 * Generate an image for an association sentence.
 * Never logs the API key. Counts only real API attempts toward the daily quota.
 */
export async function generateAssociationScene(options: {
  sentence: string;
  prefs?: ImageGenPrefs;
  storage?: StorageLike | null;
  now?: Date;
  fetchFn?: typeof fetch;
  model?: string;
  /** Extra seed suffix so 「换一张」 varies the SVG fallback. */
  seedSuffix?: string;
}): Promise<GenerateOutcome> {
  const sentence = options.sentence.trim();
  const seed = `${sentence || 'assoc'}-${options.seedSuffix ?? '0'}`;
  const svg = fallbackUrl(seed);

  if (!sentence) {
    return { kind: 'fallback', url: svg, reason: 'error' };
  }

  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const prefs = options.prefs ?? loadImageGenPrefs(storage);
  const now = options.now ?? new Date();

  if (!isConfigured(prefs)) {
    return { kind: 'fallback', url: svg, reason: 'no_key' };
  }

  if (!canGenerateToday(storage, now)) {
    return { kind: 'fallback', url: svg, reason: 'daily_limit' };
  }

  const fetchFn = options.fetchFn ?? fetch;
  const model = options.model ?? DEFAULT_MODEL;
  const endpoint = `${normalizeBaseUrl(prefs.baseUrl)}/images/generations`;

  // Record attempt before the request so flaky/spam calls still consume quota.
  recordGeneration(storage, now);

  try {
    const res = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${prefs.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(sentence),
        size: IMAGE_SIZE,
        n: 1,
      }),
    });

    if (!res.ok) {
      return { kind: 'fallback', url: svg, reason: 'error' };
    }

    const json = (await res.json()) as ApiImageResponse;
    const item = json.data?.[0];
    if (item?.b64_json) {
      return { kind: 'api', url: `data:image/png;base64,${item.b64_json}` };
    }
    if (item?.url) {
      return { kind: 'api', url: item.url };
    }
    return { kind: 'fallback', url: svg, reason: 'error' };
  } catch {
    return { kind: 'fallback', url: svg, reason: 'error' };
  }
}

export function hintForReason(reason: FallbackReason): string | null {
  if (reason === 'no_key') return null;
  if (reason === 'daily_limit') return '今天的生成次数用完了，先用示意图';
  return '生成失败，先用示意图';
}

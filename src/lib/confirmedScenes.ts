/** Confirmed association scenes for the memory-palace tray. localStorage only. */

import type { StorageLike } from './imageGen.ts';

export const CONFIRMED_SCENES_KEY = 'mt-confirmed-scenes';
export const TRAY_TITLE = '待放的画面';
export const EMPTY_TRAY_TEXT = '还没有确认的画面';
export const THUMB_PX = 64;
export const PLACED_PX = 48;
export const THUMB_RADIUS_PX = 12;
export const REVEAL_FADE_MS = 240;
export const SCENE_DRAG_TYPE = 'application/x-memory-scene';

export interface ConfirmedScene {
  id: string;
  url: string;
  sentence: string;
  confirmedAt: string;
  /** A shrunk WebP copy is in IndexedDB under `id` (see sceneImageCache.ts). */
  localCached?: boolean;
  /** 临时图: download failed; only the (expiring) remote URL is available. */
  temporary?: boolean;
}

export interface TrayView {
  title: string;
  emptyText: string | null;
  items: ConfirmedScene[];
}

export type PegVisual =
  | { type: 'text-slip'; text: string }
  | { type: 'thumb'; imageUrl: string; size: number }
  | { type: 'hidden' }
  | { type: 'revealed'; imageUrl: string; text: string; fadeMs: number };

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function isConfirmedScene(value: unknown): value is ConfirmedScene {
  if (!value || typeof value !== 'object') return false;
  const o = value as Partial<ConfirmedScene> & { kind?: string };
  if (o.kind === 'fallback') return false;
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.url === 'string' &&
    o.url.length > 0 &&
    typeof o.sentence === 'string' &&
    typeof o.confirmedAt === 'string'
  );
}

export function loadConfirmedScenes(
  storage: StorageLike | null = defaultStorage(),
): ConfirmedScene[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CONFIRMED_SCENES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isConfirmedScene);
  } catch {
    return [];
  }
}

function persist(scenes: ConfirmedScene[], storage: StorageLike | null): ConfirmedScene[] {
  if (!storage) return scenes;
  let next = scenes;
  while (true) {
    try {
      storage.setItem(CONFIRMED_SCENES_KEY, JSON.stringify(next));
      return next;
    } catch {
      if (next.length === 0) return [];
      next = next.slice(1);
    }
  }
}

function makeId(now: Date): string {
  return `scene-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Record the image the user just confirmed with 「就用这张」.
 * Swapped-away shots (confirmed: false) and failed/fallback generations never enter the tray.
 */
export function acceptScene(
  input: {
    url: string;
    sentence: string;
    kind: 'api' | 'fallback';
    confirmed: boolean;
  },
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
): { stored: boolean; scenes: ConfirmedScene[]; scene: ConfirmedScene | null } {
  const scenes = loadConfirmedScenes(storage);
  const eligible = input.confirmed && input.kind === 'api' && input.url.trim().length > 0;
  if (!eligible) return { stored: false, scenes, scene: null };
  const existing = scenes.find((s) => s.url === input.url);
  if (existing) return { stored: true, scenes, scene: existing };
  const next: ConfirmedScene = {
    id: makeId(now),
    url: input.url,
    sentence: input.sentence.trim(),
    confirmedAt: now.toISOString(),
  };
  const saved = persist([...scenes, next], storage);
  const stored = saved.some((s) => s.id === next.id);
  return { stored, scenes: saved, scene: stored ? next : null };
}

export function trayView(scenes: readonly ConfirmedScene[]): TrayView {
  if (scenes.length === 0) {
    return { title: TRAY_TITLE, emptyText: EMPTY_TRAY_TEXT, items: [] };
  }
  return { title: TRAY_TITLE, emptyText: null, items: [...scenes] };
}

/** One image per peg; a second place replaces the previous. Unknown ids are ignored. */
export function placeConfirmedImage(
  placements: Record<string, string>,
  pegId: string,
  imageId: string,
  allowedIds: readonly string[],
): Record<string, string> {
  if (!pegId || !allowedIds.includes(imageId)) return placements;
  return { ...placements, [pegId]: imageId };
}

export function imageUrlForPeg(
  placements: Record<string, string>,
  pegId: string,
  scenes: readonly ConfirmedScene[],
): string | null {
  const id = placements[pegId];
  if (!id) return null;
  return scenes.find((s) => s.id === id)?.url ?? null;
}

export function pegVisual(input: {
  phase: 'place' | 'recall';
  revealed: boolean;
  imageUrl: string | null;
  text: string;
}): PegVisual {
  if (!input.imageUrl) return { type: 'text-slip', text: input.text };
  if (input.phase === 'place') return { type: 'thumb', imageUrl: input.imageUrl, size: PLACED_PX };
  if (!input.revealed) return { type: 'hidden' };
  return {
    type: 'revealed',
    imageUrl: input.imageUrl,
    text: input.text,
    fadeMs: REVEAL_FADE_MS,
  };
}

export function sceneIdFromDrop(
  data: { getData(type: string): string },
  allowedIds: readonly string[],
): string | null {
  const id = data.getData(SCENE_DRAG_TYPE) || data.getData('text/plain');
  if (!id || !allowedIds.includes(id)) return null;
  return id;
}

/** Palace route with no confirmed images and no API dependency. */
export function palaceWithoutImages(pegs: readonly { id: string; text: string }[]): {
  needsApiKey: false;
  tray: TrayView;
  pegs: { id: string; visual: PegVisual }[];
} {
  return {
    needsApiKey: false,
    tray: trayView([]),
    pegs: pegs.map((p) => ({
      id: p.id,
      visual: pegVisual({
        phase: 'place',
        revealed: false,
        imageUrl: null,
        text: p.text,
      }),
    })),
  };
}

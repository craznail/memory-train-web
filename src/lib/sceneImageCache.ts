/**
 * Local copies of confirmed association images (issue #2 follow-up).
 *
 * Remote images expire (Tongyi/DashScope OSS links last 24h), so on 「就用这张」 we
 * download the picture, shrink it (longest edge ≤ 512), encode WebP and keep it in
 * IndexedDB. The palace tray and pegs read that local copy.
 *
 * If the download fails (CORS, network, 404) the record is marked 临时图 (temporary):
 * we keep showing the remote URL and, once it stops loading, the sentence illustration.
 * Old records from before this change (remote URL only) are cached lazily on first view.
 */

import { prefabImageUrl } from '../data/associationStudio';
import {
  CONFIRMED_SCENES_KEY,
  loadConfirmedScenes,
  type ConfirmedScene,
} from './confirmedScenes';
import type { StorageLike } from './imageGen';

export const SCENE_IMAGE_MAX_EDGE = 512;
export const SCENE_IMAGE_TYPE = 'image/webp';
export const SCENE_IMAGE_QUALITY = 0.85;
export const SCENE_DOWNLOAD_TIMEOUT_MS = 15_000;
export const TEMPORARY_LABEL = '临时图';
export const SCENE_DB_NAME = 'mt-scene-images';
export const SCENE_DB_STORE = 'images';

/** Minimal async key → Blob store; IndexedDB in the browser, a Map in tests. */
export interface SceneBlobStore {
  get(id: string): Promise<Blob | null>;
  put(id: string, blob: Blob): Promise<void>;
  delete(id: string): Promise<void>;
}

export type ImageEncoder = (source: Blob, maxEdge: number) => Promise<Blob>;

export function memorySceneStore(init: Record<string, Blob> = {}): SceneBlobStore & {
  map: Map<string, Blob>;
} {
  const map = new Map(Object.entries(init));
  return {
    map,
    get: async (id) => map.get(id) ?? null,
    put: async (id, blob) => void map.set(id, blob),
    delete: async (id) => void map.delete(id),
  };
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openSceneDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(SCENE_DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(SCENE_DB_STORE)) {
          req.result.createObjectStore(SCENE_DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

/** IndexedDB-backed store, or null where IndexedDB is unavailable. */
export function idbSceneStore(): SceneBlobStore | null {
  if (typeof indexedDB === 'undefined') return null;
  const tx = async (mode: IDBTransactionMode) =>
    (await openSceneDb()).transaction(SCENE_DB_STORE, mode).objectStore(SCENE_DB_STORE);
  return {
    get: async (id) => {
      const v = await idbRequest((await tx('readonly')).get(id));
      return v instanceof Blob ? v : null;
    },
    put: async (id, blob) => {
      await idbRequest((await tx('readwrite')).put(blob, id));
    },
    delete: async (id) => {
      await idbRequest((await tx('readwrite')).delete(id));
    },
  };
}

/** Scale (w, h) so the longest edge is ≤ max; never upscales. */
export function fitWithin(w: number, h: number, max: number = SCENE_IMAGE_MAX_EDGE) {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Browser encoder: decode → draw at ≤ maxEdge → WebP. */
export const canvasWebpEncoder: ImageEncoder = async (source, maxEdge) => {
  const bitmap = await createImageBitmap(source);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.drawImage(bitmap, 0, 0, width, height);
      return await canvas.convertToBlob({ type: SCENE_IMAGE_TYPE, quality: SCENE_IMAGE_QUALITY });
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('encode failed'))),
        SCENE_IMAGE_TYPE,
        SCENE_IMAGE_QUALITY,
      ),
    );
  } finally {
    bitmap.close();
  }
};

/** SVG illustration with the sentence; same look as the generation fallback. */
export function sceneFallbackUrl(sentence: string): string {
  const caption = sentence.trim().slice(0, 48);
  return prefabImageUrl(caption || 'scene', caption);
}

export interface CacheDeps {
  store?: SceneBlobStore | null;
  encode?: ImageEncoder;
  fetchFn?: typeof fetch;
  storage?: StorageLike | null;
  timeoutMs?: number;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Patch one stored record (no-op if it's gone). */
export function updateSceneRecord(
  id: string,
  patch: Partial<Pick<ConfirmedScene, 'localCached' | 'temporary'>>,
  storage: StorageLike | null = defaultStorage(),
): ConfirmedScene | null {
  if (!storage) return null;
  const scenes = loadConfirmedScenes(storage);
  const idx = scenes.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const next = { ...scenes[idx], ...patch };
  if (next.localCached) delete next.temporary;
  scenes[idx] = next;
  try {
    storage.setItem(CONFIRMED_SCENES_KEY, JSON.stringify(scenes));
  } catch {
    /* quota: keep in-memory result */
  }
  return next;
}

/**
 * Download → shrink → WebP → IndexedDB. Returns true when a local copy now exists.
 * On failure the record is marked 临时图. Never throws.
 */
export async function cacheSceneImage(
  scene: Pick<ConfirmedScene, 'id' | 'url'>,
  deps: CacheDeps = {},
): Promise<boolean> {
  const store = deps.store === undefined ? idbSceneStore() : deps.store;
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const encode = deps.encode ?? canvasWebpEncoder;
  const fetchFn = deps.fetchFn ?? fetch;
  if (!store) {
    updateSceneRecord(scene.id, { temporary: true }, storage);
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? SCENE_DOWNLOAD_TIMEOUT_MS);
  try {
    // no-store: an earlier <img> load (sent without Origin) may sit in the HTTP cache
    // without CORS headers and would make this CORS read fail.
    const res = await fetchFn(scene.url, {
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.blob();
    if (!raw.size) throw new Error('empty image');
    const small = await encode(raw, SCENE_IMAGE_MAX_EDGE);
    await store.put(scene.id, small);
    updateSceneRecord(scene.id, { localCached: true }, storage);
    return true;
  } catch {
    updateSceneRecord(scene.id, { temporary: true }, storage);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** What the tray / pegs should draw for one scene. */
export interface DisplayScene extends ConfirmedScene {
  /** Remote URL as stored; `url` is replaced by the display URL. */
  remoteUrl: string;
  /** SVG with the sentence, used when the image fails to load. */
  fallbackUrl: string;
  /** True when no local copy exists (shows the 临时图 badge). */
  isTemporary: boolean;
}

export interface ResolveDeps extends CacheDeps {
  createObjectUrl?: (blob: Blob) => string;
}

/**
 * Resolve the display URL for a scene:
 * 1. local copy in IndexedDB → object URL;
 * 2. otherwise (new temporary record, or legacy record without flags) try to cache now;
 * 3. still nothing → remote URL marked 临时图 (UI swaps to the SVG if it fails to load).
 */
export async function resolveDisplayScene(
  scene: ConfirmedScene,
  deps: ResolveDeps = {},
): Promise<{ display: DisplayScene; objectUrl: string | null }> {
  const store = deps.store === undefined ? idbSceneStore() : deps.store;
  const createObjectUrl = deps.createObjectUrl ?? ((b: Blob) => URL.createObjectURL(b));
  const base = { ...scene, remoteUrl: scene.url, fallbackUrl: sceneFallbackUrl(scene.sentence) };

  const fromStore = async () => {
    if (!store) return null;
    try {
      return await store.get(scene.id);
    } catch {
      return null;
    }
  };

  let blob = await fromStore();
  if (!blob && (await cacheSceneImage(scene, { ...deps, store }))) blob = await fromStore();

  if (blob) {
    const objectUrl = createObjectUrl(blob);
    return {
      display: { ...base, url: objectUrl, localCached: true, temporary: undefined, isTemporary: false },
      objectUrl,
    };
  }
  return {
    display: { ...base, localCached: false, temporary: true, isTemporary: true },
    objectUrl: null,
  };
}

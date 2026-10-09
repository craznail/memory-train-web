import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONFIRMED_SCENES_KEY,
  acceptScene,
  loadConfirmedScenes,
  type ConfirmedScene,
} from './confirmedScenes.ts';
import {
  SCENE_IMAGE_MAX_EDGE,
  cacheSceneImage,
  fitWithin,
  memorySceneStore,
  resolveDisplayScene,
  sceneFallbackUrl,
  updateSceneRecord,
  type ImageEncoder,
} from './sceneImageCache.ts';
import type { StorageLike } from './imageGen.ts';

function memStorage(init: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const PNG = new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4])], { type: 'image/png' });
const okFetch = (async () => new Response(PNG, { status: 200 })) as typeof fetch;
const fakeEncoder: ImageEncoder = async (src, maxEdge) => {
  assert.equal(maxEdge, SCENE_IMAGE_MAX_EDGE);
  return new Blob([await src.arrayBuffer()], { type: 'image/webp' });
};
const URL_A = 'https://dashscope-x.oss-accelerate.aliyuncs.com/a.png?Expires=1';

function seed(storage: StorageLike, extra: Partial<ConfirmedScene> = {}): ConfirmedScene {
  const scene: ConfirmedScene = {
    id: 'scene-1',
    url: URL_A,
    sentence: '小李把图书馆顶在头上',
    confirmedAt: '2026-10-09T06:00:00.000Z',
    ...extra,
  };
  storage.setItem(CONFIRMED_SCENES_KEY, JSON.stringify([scene]));
  return scene;
}

describe('fitWithin (longest edge ≤ 512, no upscaling)', () => {
  it('scales down square / landscape / portrait', () => {
    assert.deepEqual(fitWithin(1024, 1024), { width: 512, height: 512 });
    assert.deepEqual(fitWithin(1664, 928), { width: 512, height: 286 });
    assert.deepEqual(fitWithin(928, 1664), { width: 286, height: 512 });
  });
  it('keeps small images and rejects empty sizes', () => {
    assert.deepEqual(fitWithin(300, 200), { width: 300, height: 200 });
    assert.deepEqual(fitWithin(0, 10), { width: 0, height: 0 });
  });
});

describe('cacheSceneImage', () => {
  it('stores a WebP copy under the scene id and flags the record localCached', async () => {
    const storage = memStorage();
    const scene = seed(storage, { temporary: true });
    const store = memorySceneStore();
    let init: RequestInit | undefined;
    const ok = await cacheSceneImage(scene, {
      store,
      storage,
      encode: fakeEncoder,
      fetchFn: (async (_u: string, i?: RequestInit) => {
        init = i;
        return new Response(PNG, { status: 200 });
      }) as typeof fetch,
    });
    assert.equal(ok, true);
    assert.equal(store.map.get('scene-1')?.type, 'image/webp');
    assert.equal(init?.mode, 'cors');
    assert.equal(init?.cache, 'no-store');
    const rec = loadConfirmedScenes(storage)[0];
    assert.equal(rec.localCached, true);
    assert.equal(rec.temporary, undefined);
  });

  for (const [label, fetchFn] of [
    ['CORS / network TypeError', (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch],
    ['404 expired', (async () => new Response('gone', { status: 404 })) as typeof fetch],
  ] as const) {
    it(`${label} → record marked 临时图, nothing stored`, async () => {
      const storage = memStorage();
      const scene = seed(storage);
      const store = memorySceneStore();
      const ok = await cacheSceneImage(scene, { store, storage, encode: fakeEncoder, fetchFn });
      assert.equal(ok, false);
      assert.equal(store.map.size, 0);
      assert.equal(loadConfirmedScenes(storage)[0].temporary, true);
    });
  }

  it('encoder failure → 临时图', async () => {
    const storage = memStorage();
    const scene = seed(storage);
    const ok = await cacheSceneImage(scene, {
      store: memorySceneStore(),
      storage,
      fetchFn: okFetch,
      encode: async () => {
        throw new Error('decode failed');
      },
    });
    assert.equal(ok, false);
    assert.equal(loadConfirmedScenes(storage)[0].temporary, true);
  });

  it('no IndexedDB → 临时图 without fetching', async () => {
    const storage = memStorage();
    const scene = seed(storage);
    const ok = await cacheSceneImage(scene, {
      store: null,
      storage,
      fetchFn: (async () => {
        throw new Error('should not fetch');
      }) as typeof fetch,
    });
    assert.equal(ok, false);
    assert.equal(loadConfirmedScenes(storage)[0].temporary, true);
  });

  it('hanging download is aborted by the timeout → 临时图', async () => {
    const storage = memStorage();
    const scene = seed(storage);
    const ok = await cacheSceneImage(scene, {
      store: memorySceneStore(),
      storage,
      encode: fakeEncoder,
      timeoutMs: 30,
      fetchFn: (async (_u: string, i?: RequestInit) =>
        new Promise<Response>((_r, rej) =>
          i?.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError'))),
        )) as typeof fetch,
    });
    assert.equal(ok, false);
    assert.equal(loadConfirmedScenes(storage)[0].temporary, true);
  });
});

describe('resolveDisplayScene', () => {
  const objUrl = (b: Blob) => `blob:test/${b.type}`;

  it('cached record reads IndexedDB and never touches the (expired) remote URL', async () => {
    const storage = memStorage();
    const scene = seed(storage, { localCached: true });
    const store = memorySceneStore({ 'scene-1': new Blob(['x'], { type: 'image/webp' }) });
    const { display, objectUrl } = await resolveDisplayScene(scene, {
      store,
      storage,
      createObjectUrl: objUrl,
      fetchFn: (async () => {
        throw new Error('remote must not be fetched');
      }) as typeof fetch,
    });
    assert.equal(display.url, 'blob:test/image/webp');
    assert.equal(objectUrl, 'blob:test/image/webp');
    assert.equal(display.remoteUrl, URL_A);
    assert.equal(display.isTemporary, false);
  });

  it('legacy record (remote URL only) is cached lazily on first view', async () => {
    const storage = memStorage();
    const scene = seed(storage); // no localCached / temporary flags = pre-cache record
    const store = memorySceneStore();
    const { display } = await resolveDisplayScene(scene, {
      store,
      storage,
      encode: fakeEncoder,
      fetchFn: okFetch,
      createObjectUrl: objUrl,
    });
    assert.equal(display.url, 'blob:test/image/webp');
    assert.equal(display.isTemporary, false);
    assert.equal(store.map.has('scene-1'), true);
    assert.equal(loadConfirmedScenes(storage)[0].localCached, true);
  });

  it('legacy record whose download fails → 临时图 with remote URL + sentence fallback', async () => {
    const storage = memStorage();
    const scene = seed(storage);
    const { display, objectUrl } = await resolveDisplayScene(scene, {
      store: memorySceneStore(),
      storage,
      encode: fakeEncoder,
      fetchFn: (async () => {
        throw new TypeError('Failed to fetch');
      }) as typeof fetch,
      createObjectUrl: objUrl,
    });
    assert.equal(objectUrl, null);
    assert.equal(display.isTemporary, true);
    assert.equal(display.url, URL_A);
    assert.equal(display.fallbackUrl, sceneFallbackUrl('小李把图书馆顶在头上'));
    assert.equal(loadConfirmedScenes(storage)[0].temporary, true);
  });

  it('localCached flag but IndexedDB was cleared → re-download, else 临时图', async () => {
    const storage = memStorage();
    const scene = seed(storage, { localCached: true });
    const { display } = await resolveDisplayScene(scene, {
      store: memorySceneStore(),
      storage,
      encode: fakeEncoder,
      fetchFn: (async () => new Response('', { status: 404 })) as typeof fetch,
      createObjectUrl: objUrl,
    });
    assert.equal(display.isTemporary, true);
    assert.equal(display.url, URL_A);
  });
});

describe('fallback illustration + record updates', () => {
  it('fallback SVG carries the sentence only', () => {
    const svg = decodeURIComponent(sceneFallbackUrl('小李把图书馆顶在头上'));
    assert.match(svg, /^data:image\/svg\+xml/);
    assert.match(svg, />小李把图书馆顶在头上</);
  });

  it('updateSceneRecord: localCached clears temporary; unknown id is a no-op', () => {
    const storage = memStorage();
    seed(storage, { temporary: true });
    assert.equal(updateSceneRecord('missing', { localCached: true }, storage), null);
    const rec = updateSceneRecord('scene-1', { localCached: true }, storage);
    assert.equal(rec?.temporary, undefined);
    assert.equal(loadConfirmedScenes(storage)[0].localCached, true);
  });

  it('acceptScene returns the stored record (so 「就用这张」 can cache it) and keeps legacy records', () => {
    const storage = memStorage();
    seed(storage);
    const res = acceptScene({ url: 'data:image/png;base64,AAA', sentence: '新句子', kind: 'api', confirmed: true }, storage);
    assert.equal(res.stored, true);
    assert.equal(res.scene?.url, 'data:image/png;base64,AAA');
    assert.equal(loadConfirmedScenes(storage).length, 2);
    const dup = acceptScene({ url: URL_A, sentence: 'x', kind: 'api', confirmed: true }, storage);
    assert.equal(dup.scene?.id, 'scene-1');
  });
});

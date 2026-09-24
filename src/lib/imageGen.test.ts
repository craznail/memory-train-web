import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DAILY_LIMIT,
  DAILY_LIMIT_HINT,
  GEN_FAILED_HINT,
  MAX_SWAPS_PER_SENTENCE,
  SWAP_EXHAUSTED_HINT,
  buildPrompt,
  canGenerateToday,
  canSwap,
  generateAssociationScene,
  getDailyCount,
  hintForReason,
  isConfigured,
  loadDailyUsage,
  loadImageGenPrefs,
  recordGeneration,
  saveImageGenPrefs,
  type StorageLike,
} from './imageGen.ts';

function memStorage(init: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('imageGen prefs + quota', () => {
  it('isConfigured only when apiKey present', () => {
    assert.equal(isConfigured({ baseUrl: 'https://api.openai.com/v1', apiKey: '' }), false);
    assert.equal(isConfigured({ baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-x' }), true);
  });

  it('persists prefs', () => {
    const s = memStorage();
    saveImageGenPrefs({ baseUrl: 'https://example.com/v1', apiKey: 'secret' }, s);
    const loaded = loadImageGenPrefs(s);
    assert.equal(loaded.apiKey, 'secret');
    assert.equal(loaded.baseUrl, 'https://example.com/v1');
  });

  it('daily counter resets on new local day', () => {
    const s = memStorage();
    const d1 = new Date(2026, 8, 24, 10, 0, 0);
    for (let i = 0; i < DAILY_LIMIT; i++) recordGeneration(s, d1);
    assert.equal(getDailyCount(s, d1), DAILY_LIMIT);
    assert.equal(canGenerateToday(s, d1), false);
    const d2 = new Date(2026, 8, 25, 10, 0, 0);
    assert.equal(loadDailyUsage(s, d2).count, 0);
    assert.equal(canGenerateToday(s, d2), true);
  });

  it('swap cap is 3', () => {
    assert.equal(canSwap(0), true);
    assert.equal(canSwap(MAX_SWAPS_PER_SENTENCE - 1), true);
    assert.equal(canSwap(MAX_SWAPS_PER_SENTENCE), false);
  });

  it('buildPrompt appends style suffix', () => {
    const p = buildPrompt('小李飞起来');
    assert.match(p, /小李飞起来/);
    assert.match(p, /Flat illustration/);
  });

  it('hintForReason copy', () => {
    assert.equal(hintForReason('no_key'), null);
    assert.equal(hintForReason('daily_limit'), DAILY_LIMIT_HINT);
    assert.equal(hintForReason('error'), GEN_FAILED_HINT);
    assert.equal(SWAP_EXHAUSTED_HINT, '这句已换 3 次');
    assert.equal(DAILY_LIMIT_HINT, '今日生成次数已用完，明天再来');
  });
});

describe('generateAssociationScene paths', () => {
  it('no key → silent SVG fallback', async () => {
    const s = memStorage();
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://api.openai.com/v1', apiKey: '' },
      storage: s,
      fetchFn: async () => {
        throw new Error('should not fetch');
      },
    });
    assert.equal(out.kind, 'fallback');
    if (out.kind === 'fallback') assert.equal(out.reason, 'no_key');
    assert.match(out.url, /^data:image\/svg\+xml/);
    assert.equal(getDailyCount(s), 0);
  });

  it('daily limit → SVG + daily_limit', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    for (let i = 0; i < DAILY_LIMIT; i++) recordGeneration(s, now);
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://bad.example/v1', apiKey: 'sk-test' },
      storage: s,
      now,
      fetchFn: async () => {
        throw new Error('should not fetch');
      },
    });
    assert.equal(out.kind, 'fallback');
    if (out.kind === 'fallback') assert.equal(out.reason, 'daily_limit');
  });

  it('network error → SVG + error and counts attempt', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://127.0.0.1:9/v1', apiKey: 'sk-test' },
      storage: s,
      now,
      fetchFn: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    assert.equal(out.kind, 'fallback');
    if (out.kind === 'fallback') assert.equal(out.reason, 'error');
    assert.equal(getDailyCount(s, now), 1);
  });

  it('handles b64_json success', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://api.example/v1', apiKey: 'sk-test' },
      storage: s,
      now,
      fetchFn: async (_url, init) => {
        const headers = init?.headers as Record<string, string>;
        assert.match(headers.Authorization, /^Bearer sk-test$/);
        const body = JSON.parse(String(init?.body));
        assert.equal(body.size, '1024x1024');
        assert.equal(body.n, 1);
        return {
          ok: true,
          json: async () => ({ data: [{ b64_json: 'abc123' }] }),
        } as Response;
      },
    });
    assert.equal(out.kind, 'api');
    if (out.kind === 'api') assert.equal(out.url, 'data:image/png;base64,abc123');
  });

  it('handles url success', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://api.example/v1/', apiKey: 'sk-test' },
      storage: s,
      now,
      fetchFn: async (url) => {
        assert.equal(String(url), 'https://api.example/v1/images/generations');
        return {
          ok: true,
          json: async () => ({ data: [{ url: 'https://cdn.example/img.png' }] }),
        } as Response;
      },
    });
    assert.equal(out.kind, 'api');
    if (out.kind === 'api') assert.equal(out.url, 'https://cdn.example/img.png');
  });

  it('aborts on timeout → SVG + error', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://api.example/v1', apiKey: 'sk-test' },
      storage: s,
      now,
      timeoutMs: 40,
      fetchFn: async (_url, init) => {
        const signal = init?.signal;
        await new Promise<void>((_resolve, reject) => {
          const t = setTimeout(() => reject(new Error('too slow')), 5000);
          signal?.addEventListener('abort', () => {
            clearTimeout(t);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
        return { ok: true, json: async () => ({ data: [] }) } as Response;
      },
    });
    assert.equal(out.kind, 'fallback');
    if (out.kind === 'fallback') assert.equal(out.reason, 'error');
  });
});

describe('empty sentence and captions', () => {
  it('empty sentence never reads as daily limit and does not consume quota', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    assert.equal(canGenerateToday(s, now), true);
    const out = await generateAssociationScene({
      sentence: '   ',
      prefs: { baseUrl: 'https://bad.example/v1', apiKey: 'sk-test' },
      storage: s,
      now,
      fetchFn: async () => {
        throw new Error('should not fetch');
      },
    });
    assert.equal(out.kind, 'fallback');
    if (out.kind === 'fallback') assert.notEqual(out.reason, 'daily_limit');
    assert.equal(getDailyCount(s, now), 0);
    assert.equal(canGenerateToday(s, now), true);
  });

  it('fallback SVG caption is the sentence only, no internal ids or swap suffix', async () => {
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://api.openai.com/v1', apiKey: '' },
      storage: memStorage(),
      seedSuffix: '2',
    });
    const svg = decodeURIComponent(out.url);
    assert.match(svg, />小李把图书馆顶在头上</);
    assert.doesNotMatch(svg, /小李把图书馆顶在头上-2/);
    assert.doesNotMatch(svg, /daily-limit|assoc/);
  });

  it('with a sentence and quota left, a configured key actually requests and counts once', async () => {
    const s = memStorage();
    const now = new Date(2026, 8, 24, 12, 0, 0);
    let calls = 0;
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { baseUrl: 'https://mock.example/v1', apiKey: 'sk-test' },
      storage: s,
      now,
      fetchFn: (async () => {
        calls++;
        return new Response(JSON.stringify({ data: [{ b64_json: 'iVBORw0KGgo=' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch,
    });
    assert.equal(calls, 1);
    assert.equal(out.kind, 'api');
    assert.equal(getDailyCount(s, now), 1);
  });
});

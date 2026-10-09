import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TONGYI_DEFAULT_BASE_URL,
  TONGYI_DEFAULT_MODEL,
  TongyiError,
  buildTongyiBody,
  buildTongyiHeaders,
  errorKindForStatus,
  extractTongyiImage,
  tongyiGenerateImage,
  tongyiModeFor,
  tongyiSubmitUrl,
  tongyiTaskUrl,
} from './tongyi.ts';
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  PROVIDER_DEFAULTS,
  generateAssociationScene,
  getDailyCount,
  loadImageGenPrefs,
  resolveImageGenPrefs,
  saveImageGenPrefs,
  type StorageLike,
} from './imageGen.ts';

function memStorage(init: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(init));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const IMG = 'https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/x.png?Expires=1';
const succeeded = (id = 't1') => ({
  output: {
    task_id: id,
    task_status: 'SUCCEEDED',
    choices: [
      { finish_reason: 'stop', message: { role: 'assistant', content: [{ image: IMG, type: 'image' }] } },
    ],
  },
  request_id: 'r',
});

describe('tongyi request building (per DashScope docs)', () => {
  it('defaults: qwen-image-3.0 on the Beijing endpoint', () => {
    assert.equal(TONGYI_DEFAULT_MODEL, 'qwen-image-3.0');
    assert.equal(TONGYI_DEFAULT_BASE_URL, 'https://dashscope.aliyuncs.com/api/v1');
  });

  it('submit / task URLs for async and sync', () => {
    assert.equal(
      tongyiSubmitUrl('https://dashscope.aliyuncs.com/api/v1/', 'async'),
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation',
    );
    assert.equal(
      tongyiSubmitUrl('https://dashscope.aliyuncs.com/api/v1', 'sync'),
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    );
    assert.equal(
      tongyiTaskUrl('https://dashscope.aliyuncs.com/api/v1', 'abc'),
      'https://dashscope.aliyuncs.com/api/v1/tasks/abc',
    );
  });

  it('mode: async by default, sync on intl/Singapore hosts (tasks preflight blocked)', () => {
    assert.equal(tongyiModeFor('https://dashscope.aliyuncs.com/api/v1'), 'async');
    assert.equal(tongyiModeFor('https://ws1.cn-beijing.maas.aliyuncs.com/api/v1'), 'async');
    assert.equal(tongyiModeFor('http://127.0.0.1:8787/api/v1'), 'async');
    assert.equal(tongyiModeFor('https://dashscope-intl.aliyuncs.com/api/v1'), 'sync');
    assert.equal(tongyiModeFor('https://ws1.ap-southeast-1.maas.aliyuncs.com/api/v1'), 'sync');
  });

  it('body uses messages/content[text] + `*` size separator', () => {
    const b = buildTongyiBody('qwen-image-3.0', '小李飞起来');
    assert.deepEqual(b.input.messages, [{ role: 'user', content: [{ text: '小李飞起来' }] }]);
    assert.equal(b.parameters.size, '1024*1024');
    assert.equal(b.parameters.n, 1);
    assert.equal(b.parameters.prompt_extend, false);
  });

  it('headers: Bearer auth, X-DashScope-Async only for async', () => {
    const a = buildTongyiHeaders(' key ', 'async');
    assert.equal(a.Authorization, 'Bearer key');
    assert.equal(a['X-DashScope-Async'], 'enable');
    assert.equal(buildTongyiHeaders('key', 'sync')['X-DashScope-Async'], undefined);
  });

  it('extracts image from choices (3.0) and results (legacy)', () => {
    assert.equal(extractTongyiImage(succeeded()), IMG);
    assert.equal(extractTongyiImage({ output: { results: [{ url: 'u' }] } }), 'u');
    assert.equal(extractTongyiImage({ output: { task_status: 'PENDING' } }), null);
    assert.equal(extractTongyiImage(null), null);
  });

  it('error mapping by HTTP status', () => {
    assert.equal(errorKindForStatus(401), 'auth');
    assert.equal(errorKindForStatus(403), 'auth');
    assert.equal(errorKindForStatus(429), 'rate_limit');
    assert.equal(errorKindForStatus(400), 'bad_request');
    assert.equal(errorKindForStatus(500), 'server');
    assert.equal(errorKindForStatus(503), 'server');
  });
});

describe('tongyiGenerateImage flow', () => {
  const base = { baseUrl: 'http://mock/api/v1', apiKey: 'k', model: 'qwen-image-3.0', prompt: 'p' };

  it('async: submit → PENDING → RUNNING → SUCCEEDED', async () => {
    const calls: string[] = [];
    const statuses = ['PENDING', 'RUNNING'];
    const url = await tongyiGenerateImage({
      ...base,
      timeoutMs: 2000,
      pollIntervalMs: 5,
      fetchFn: (async (u: string, init?: RequestInit) => {
        calls.push(`${init?.method} ${u}`);
        if (init?.method === 'POST') {
          const h = init.headers as Record<string, string>;
          assert.equal(h['X-DashScope-Async'], 'enable');
          assert.equal(JSON.parse(String(init.body)).model, 'qwen-image-3.0');
          return json(200, { output: { task_id: 't1', task_status: 'PENDING' }, request_id: 'r' });
        }
        assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer k');
        const s = statuses.shift();
        return json(200, s ? { output: { task_id: 't1', task_status: s } } : succeeded());
      }) as typeof fetch,
    });
    assert.equal(url, IMG);
    assert.deepEqual(calls, [
      'POST http://mock/api/v1/services/aigc/image-generation/generation',
      'GET http://mock/api/v1/tasks/t1',
      'GET http://mock/api/v1/tasks/t1',
      'GET http://mock/api/v1/tasks/t1',
    ]);
  });

  it('sync: image returned directly, no polling', async () => {
    let n = 0;
    const url = await tongyiGenerateImage({
      ...base,
      mode: 'sync',
      timeoutMs: 2000,
      fetchFn: (async (u: string) => {
        n++;
        assert.match(u, /multimodal-generation\/generation$/);
        return json(200, succeeded());
      }) as typeof fetch,
    });
    assert.equal(url, IMG);
    assert.equal(n, 1);
  });

  async function expectKind(kind: string, fetchFn: typeof fetch, timeoutMs = 2000) {
    await assert.rejects(
      tongyiGenerateImage({ ...base, timeoutMs, pollIntervalMs: 5, fetchFn }),
      (e: unknown) => e instanceof TongyiError && e.kind === kind,
    );
  }

  it('401 InvalidApiKey → auth', () =>
    expectKind('auth', (async () =>
      json(401, { code: 'InvalidApiKey', message: 'Invalid API-key provided.' })) as typeof fetch));

  it('500 → server', () =>
    expectKind('server', (async () =>
      json(500, { code: 'InternalError', message: 'boom' })) as typeof fetch));

  it('task FAILED → task_failed', () =>
    expectKind('task_failed', (async (_u: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json(200, { output: { task_id: 't', task_status: 'PENDING' } })
        : json(200, { output: { task_id: 't', task_status: 'FAILED', code: 'InternalError' } })) as typeof fetch));

  it('submit without task_id or image → bad_response', () =>
    expectKind('bad_response', (async () => json(200, { output: {} })) as typeof fetch));

  it('network error → network', () =>
    expectKind('network', (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch));

  it('task never finishes → timeout within TOTAL budget', async () => {
    const t0 = Date.now();
    await expectKind(
      'timeout',
      (async (_u: string, init?: RequestInit) =>
        init?.method === 'POST'
          ? json(200, { output: { task_id: 't', task_status: 'PENDING' } })
          : json(200, { output: { task_id: 't', task_status: 'RUNNING' } })) as typeof fetch,
      120,
    );
    assert.ok(Date.now() - t0 < 1000, 'polling must stop at the total deadline');
  });

  it('hanging submit is aborted → timeout', () =>
    expectKind(
      'timeout',
      (async (_u: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) =>
          init?.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError'))),
        )) as typeof fetch,
      60,
    ));
});

describe('settings migration + provider dispatch', () => {
  it('pre-#2 prefs {baseUrl, apiKey} migrate to OpenAI-compatible + gpt-image-1', () => {
    const s = memStorage({
      'mt-image-gen-prefs': JSON.stringify({ baseUrl: 'https://my.proxy/v1', apiKey: 'sk-old' }),
    });
    const p = loadImageGenPrefs(s);
    assert.deepEqual(p, {
      provider: 'openai',
      baseUrl: 'https://my.proxy/v1',
      model: DEFAULT_MODEL,
      apiKey: 'sk-old',
    });
  });

  it('empty storage → OpenAI defaults', () => {
    assert.deepEqual(loadImageGenPrefs(memStorage()), {
      provider: 'openai',
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      apiKey: '',
    });
  });

  it('unknown provider / blank fields fall back to defaults', () => {
    const p = resolveImageGenPrefs({ provider: 'x' as never, baseUrl: ' ', model: '', apiKey: 'k' });
    assert.equal(p.provider, 'openai');
    assert.equal(p.baseUrl, DEFAULT_BASE_URL);
    assert.equal(p.model, DEFAULT_MODEL);
  });

  it('tongyi with blank model/endpoint → qwen-image-3.0 + official endpoint; round-trips', () => {
    const s = memStorage();
    saveImageGenPrefs({ provider: 'tongyi', baseUrl: '', model: '', apiKey: 'k' }, s);
    const p = loadImageGenPrefs(s);
    assert.equal(p.provider, 'tongyi');
    assert.equal(p.model, 'qwen-image-3.0');
    assert.equal(p.baseUrl, PROVIDER_DEFAULTS.tongyi.baseUrl);
  });

  it('generateAssociationScene routes tongyi prefs to the DashScope adapter and counts quota once', async () => {
    const s = memStorage();
    const now = new Date(2026, 9, 9, 12);
    const seen: string[] = [];
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { provider: 'tongyi', baseUrl: 'http://mock/api/v1', model: 'qwen-image-3.0', apiKey: 'k' },
      storage: s,
      now,
      pollIntervalMs: 5,
      fetchFn: (async (u: string, init?: RequestInit) => {
        seen.push(u);
        return init?.method === 'POST'
          ? json(200, { output: { task_id: 't1', task_status: 'PENDING' } })
          : json(200, succeeded());
      }) as typeof fetch,
    });
    assert.equal(out.kind, 'api');
    if (out.kind === 'api') assert.equal(out.url, IMG);
    assert.ok(seen.every((u) => !u.includes('/images/generations')));
    assert.equal(getDailyCount(s, now), 1);
  });

  for (const [label, status] of [['401', 401], ['500', 500]] as const) {
    it(`tongyi ${label} → SVG fallback with reason error`, async () => {
      const out = await generateAssociationScene({
        sentence: '小李把图书馆顶在头上',
        prefs: { provider: 'tongyi', baseUrl: 'http://mock/api/v1', apiKey: 'k' },
        storage: memStorage(),
        fetchFn: (async () => json(status, { code: 'X', message: 'x' })) as typeof fetch,
      });
      assert.equal(out.kind, 'fallback');
      if (out.kind === 'fallback') assert.equal(out.reason, 'error');
      assert.match(out.url, /^data:image\/svg\+xml/);
    });
  }

  it('tongyi timeout → SVG fallback', async () => {
    const out = await generateAssociationScene({
      sentence: '小李把图书馆顶在头上',
      prefs: { provider: 'tongyi', baseUrl: 'http://mock/api/v1', apiKey: 'k' },
      storage: memStorage(),
      timeoutMs: 80,
      pollIntervalMs: 10,
      fetchFn: (async (_u: string, init?: RequestInit) =>
        init?.method === 'POST'
          ? json(200, { output: { task_id: 't', task_status: 'PENDING' } })
          : json(200, { output: { task_id: 't', task_status: 'RUNNING' } })) as typeof fetch,
    });
    assert.equal(out.kind, 'fallback');
    assert.match(out.url, /^data:image\/svg\+xml/);
  });
});

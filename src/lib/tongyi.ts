/**
 * Tongyi (Alibaba Cloud Model Studio / DashScope) image adapter for qwen-image-3.0.
 *
 * Docs (checked 2026-10-09):
 *   https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference
 *   https://help.aliyun.com/zh/model-studio/qwen-image-3-0
 *
 * - Auth: `Authorization: Bearer <DashScope API key>`.
 * - Sync:  POST {base}/services/aigc/multimodal-generation/generation
 * - Async: POST {base}/services/aigc/image-generation/generation + `X-DashScope-Async: enable`
 *          → output.task_id, then GET {base}/tasks/{task_id} until SUCCEEDED / FAILED.
 * - Request body (both): { model, input: { messages: [{ role: 'user', content: [{ text }] }] }, parameters }
 * - Result: output.choices[0].message.content[].image (PNG URL, valid 24h).
 * - Errors: HTTP status + { code, message, request_id }; failed task → output.task_status = FAILED.
 *
 * The key is only sent to the configured endpoint and never logged.
 */

export const TONGYI_DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';
export const TONGYI_DEFAULT_MODEL = 'qwen-image-3.0';
/** DashScope protocol uses `*` as size separator (OpenAI protocol uses `x`). */
export const TONGYI_IMAGE_SIZE = '1024*1024';
export const TONGYI_POLL_INTERVAL_MS = 1500;

export const TONGYI_SYNC_PATH = '/services/aigc/multimodal-generation/generation';
export const TONGYI_ASYNC_PATH = '/services/aigc/image-generation/generation';

export type TongyiMode = 'sync' | 'async';

export type TongyiErrorKind =
  | 'auth'
  | 'rate_limit'
  | 'bad_request'
  | 'server'
  | 'task_failed'
  | 'timeout'
  | 'network'
  | 'bad_response';

export class TongyiError extends Error {
  readonly kind: TongyiErrorKind;
  readonly status?: number;
  readonly code?: string;
  constructor(kind: TongyiErrorKind, message: string, status?: number, code?: string) {
    super(message);
    this.name = 'TongyiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export function normalizeTongyiBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '') || TONGYI_DEFAULT_BASE_URL;
}

/**
 * Async (submit + poll) by default. Singapore / intl endpoints reject the browser CORS
 * preflight for `GET /tasks/{id}` (HTTP 403, checked 2026-10-09), so use the sync call there.
 */
export function tongyiModeFor(baseUrl: string): TongyiMode {
  let host = '';
  try {
    host = new URL(normalizeTongyiBaseUrl(baseUrl)).hostname;
  } catch {
    return 'async';
  }
  if (host.startsWith('dashscope-intl.') || host.includes('.ap-southeast-1.')) return 'sync';
  return 'async';
}

export function tongyiSubmitUrl(baseUrl: string, mode: TongyiMode): string {
  return `${normalizeTongyiBaseUrl(baseUrl)}${mode === 'async' ? TONGYI_ASYNC_PATH : TONGYI_SYNC_PATH}`;
}

export function tongyiTaskUrl(baseUrl: string, taskId: string): string {
  return `${normalizeTongyiBaseUrl(baseUrl)}/tasks/${encodeURIComponent(taskId)}`;
}

export function buildTongyiBody(model: string, prompt: string) {
  return {
    model,
    input: {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
    },
    parameters: {
      size: TONGYI_IMAGE_SIZE,
      n: 1,
      // Our prompt already carries the style; skipping rewrite/thinking keeps us inside 20s.
      prompt_extend: false,
      watermark: false,
    },
  };
}

export function buildTongyiHeaders(apiKey: string, mode: TongyiMode): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  };
  if (mode === 'async') headers['X-DashScope-Async'] = 'enable';
  return headers;
}

interface TongyiContentItem {
  image?: string;
  text?: string;
  type?: string;
}

interface TongyiResponse {
  output?: {
    task_id?: string;
    task_status?: string;
    code?: string;
    message?: string;
    choices?: Array<{ message?: { content?: TongyiContentItem[] } }>;
    /** Older text2image (qwen-image / -plus) shape. */
    results?: Array<{ url?: string }>;
  };
  code?: string;
  message?: string;
  request_id?: string;
}

/** Pull the first image URL out of a sync result or a SUCCEEDED task. */
export function extractTongyiImage(json: unknown): string | null {
  const out = (json as TongyiResponse | null)?.output;
  if (!out) return null;
  for (const choice of out.choices ?? []) {
    for (const item of choice.message?.content ?? []) {
      if (typeof item.image === 'string' && item.image) return item.image;
    }
  }
  const legacy = out.results?.find((r) => typeof r.url === 'string' && r.url);
  return legacy?.url ?? null;
}

export function errorKindForStatus(status: number): TongyiErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'bad_request';
}

async function readJson(res: Response): Promise<TongyiResponse | null> {
  try {
    return (await res.json()) as TongyiResponse;
  } catch {
    return null;
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export interface TongyiRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  /** TOTAL budget for submit + all polls. */
  timeoutMs: number;
  fetchFn?: typeof fetch;
  mode?: TongyiMode;
  pollIntervalMs?: number;
}

/**
 * Returns the generated image URL or throws TongyiError.
 * One AbortController covers submit + polling, so the whole call never exceeds timeoutMs.
 */
export async function tongyiGenerateImage(req: TongyiRequest): Promise<string> {
  const fetchFn = req.fetchFn ?? fetch;
  const mode = req.mode ?? tongyiModeFor(req.baseUrl);
  const pollMs = req.pollIntervalMs ?? TONGYI_POLL_INTERVAL_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, req.timeoutMs);

  const fail = (err: unknown): never => {
    if (err instanceof TongyiError) throw err;
    if (timedOut) throw new TongyiError('timeout', `no image within ${req.timeoutMs}ms`);
    throw new TongyiError('network', err instanceof Error ? err.message : 'network error');
  };

  try {
    const res = await fetchFn(tongyiSubmitUrl(req.baseUrl, mode), {
      method: 'POST',
      headers: buildTongyiHeaders(req.apiKey, mode),
      body: JSON.stringify(buildTongyiBody(req.model, req.prompt)),
      signal: controller.signal,
    });
    const json = await readJson(res);
    if (!res.ok) {
      throw new TongyiError(
        errorKindForStatus(res.status),
        json?.message || `HTTP ${res.status}`,
        res.status,
        json?.code,
      );
    }

    const direct = extractTongyiImage(json);
    if (direct) return direct;

    const taskId = json?.output?.task_id;
    if (!taskId) throw new TongyiError('bad_response', 'no image and no task_id', res.status);

    // Poll until SUCCEEDED / FAILED or the shared deadline aborts us.
    for (;;) {
      await sleep(pollMs, controller.signal);
      const poll = await fetchFn(tongyiTaskUrl(req.baseUrl, taskId), {
        method: 'GET',
        headers: { Authorization: `Bearer ${req.apiKey.trim()}` },
        signal: controller.signal,
      });
      const task = await readJson(poll);
      if (!poll.ok) {
        throw new TongyiError(
          errorKindForStatus(poll.status),
          task?.message || `HTTP ${poll.status}`,
          poll.status,
          task?.code,
        );
      }
      const status = task?.output?.task_status;
      if (status === 'SUCCEEDED') {
        const url = extractTongyiImage(task);
        if (!url) throw new TongyiError('bad_response', 'task succeeded without image');
        return url;
      }
      if (status === 'FAILED' || status === 'CANCELED' || status === 'UNKNOWN') {
        throw new TongyiError(
          'task_failed',
          task?.output?.message || `task ${status}`,
          poll.status,
          task?.output?.code,
        );
      }
      // PENDING / RUNNING → keep polling.
    }
  } catch (err) {
    return fail(err);
  } finally {
    clearTimeout(timer);
  }
}

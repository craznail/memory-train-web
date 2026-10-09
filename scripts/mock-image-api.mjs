#!/usr/bin/env node
/**
 * OpenAI-compatible mock for POST /v1/images/generations.
 *
 * Modes (checked in order: query ?mode= → path /mode/... → env MOCK_MODE):
 *   success (default) | 401 | 500 | hang
 *
 * Env:
 *   PORT          listen port (default 8787)
 *   MOCK_MODE     default mode
 *   HANG_MS       hang duration (default 35000)
 *   HEADER_LOG    path to append request header logs (default ./mock-image-api-headers.log)
 *
 * DashScope (通义 qwen-image-3.0) routes, mounted under /api/v1 (issue #2):
 *   POST /api/v1/services/aigc/image-generation/generation   async submit (needs X-DashScope-Async: enable)
 *   GET  /api/v1/tasks/{task_id}                              task polling
 *   POST /api/v1/services/aigc/multimodal-generation/generation  sync call
 *   GET  /oss/{task_id}.png                                   result image (stands in for the OSS URL)
 * Extra DashScope modes: task_failed (task ends FAILED). `hang` keeps the task RUNNING forever.
 *   TASK_POLLS   polls before a task SUCCEEDS (default 2 → PENDING, RUNNING, SUCCEEDED)
 *
 * CORS: fully open, allows Authorization / X-DashScope-Async + OPTIONS preflight.
 * Header log redacts Authorization to its scheme + last 4 chars.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DEFAULT_MODE = process.env.MOCK_MODE || 'success';
const HANG_MS = Number(process.env.HANG_MS || 35000);
const HEADER_LOG = process.env.HEADER_LOG || path.join(__dirname, 'mock-image-api-headers.log');
const SAMPLE_B64 = fs.readFileSync(path.join(__dirname, 'sample-image.b64'), 'utf8').trim();
const TASK_POLLS = Number(process.env.TASK_POLLS || 2);
/** task_id → { mode, polls } */
const tasks = new Map();
let taskSeq = 0;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, OpenAI-Beta, X-Requested-With, X-DashScope-Async',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parseMode(reqUrl) {
  const u = new URL(reqUrl, 'http://localhost');
  if (u.searchParams.get('mode')) return u.searchParams.get('mode');
  const m = u.pathname.match(/\/(success|401|500|hang|task_failed)(?:\/|$)/);
  if (m) return m[1];
  return DEFAULT_MODE;
}

function isGenerationsPath(pathname) {
  return (
    pathname === '/v1/images/generations' ||
    pathname.endsWith('/images/generations') ||
    /\/(success|401|500|hang)\/v1\/images\/generations$/.test(pathname) ||
    /\/v1\/images\/generations\/(success|401|500|hang)$/.test(pathname)
  );
}

function logHeaders(req, mode) {
  const entry = {
    ts: new Date().toISOString(),
    method: req.method,
    url: req.url,
    mode,
    headers: redact({ ...req.headers }),
  };
  fs.appendFileSync(HEADER_LOG, JSON.stringify(entry) + '\n');
}

function redact(headers) {
  if (headers.authorization) {
    const v = String(headers.authorization);
    headers.authorization = `${v.split(' ')[0]} ***${v.slice(-4)}`;
  }
  return headers;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const rid = () => `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function dashscopeError(res, mode) {
  if (mode === '401') {
    json(res, 401, { code: 'InvalidApiKey', message: 'Invalid API-key provided.', request_id: rid() });
    return true;
  }
  if (mode === '500') {
    json(res, 500, { code: 'InternalError', message: 'An internal error has occurred.', request_id: rid() });
    return true;
  }
  return false;
}

function choicesFor(id, base) {
  return [
    {
      finish_reason: 'stop',
      message: { role: 'assistant', content: [{ image: `${base}/oss/${id}.png?Expires=9999999999`, type: 'image' }] },
    },
  ];
}

const QWEN_USAGE = {
  output_height: 1024,
  output_width: 1024,
  input_image_count: 0,
  input_image_type: 'qima_input_1k',
  output_image_count: 1,
  output_image_type: 'qima_output_1k',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);
  const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const mode = parseMode(req.url || '/');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && u.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, mode: DEFAULT_MODE }));
    return;
  }

  const base = `http://${req.headers.host}`;

  if (req.method === 'GET' && /^\/oss\/[^/]+\.png$/.test(u.pathname)) {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(Buffer.from(SAMPLE_B64, 'base64'));
    return;
  }

  if (req.method === 'POST' && u.pathname.endsWith('/services/aigc/image-generation/generation')) {
    logHeaders(req, mode);
    const body = JSON.parse((await readBody(req)) || '{}');
    if (req.headers['x-dashscope-async'] !== 'enable') {
      json(res, 403, {
        code: 'AccessDenied',
        message: 'current user api does not support synchronous calls',
        request_id: rid(),
      });
      return;
    }
    if (dashscopeError(res, mode)) return;
    const text = body?.input?.messages?.[0]?.content?.find?.((c) => c.text)?.text;
    if (!body.model || !text) {
      json(res, 400, { code: 'InvalidParameter', message: 'model and input.messages[0].content[].text required', request_id: rid() });
      return;
    }
    const id = `task-${++taskSeq}-${Date.now().toString(36)}`;
    tasks.set(id, { mode, polls: 0 });
    json(res, 200, { output: { task_status: 'PENDING', task_id: id }, request_id: rid() });
    return;
  }

  const taskMatch = u.pathname.match(/\/api\/v1\/tasks\/([^/]+)$/);
  if (req.method === 'GET' && taskMatch) {
    logHeaders(req, mode);
    const id = decodeURIComponent(taskMatch[1]);
    const t = tasks.get(id);
    if (!req.headers.authorization) {
      json(res, 401, { code: 'InvalidApiKey', message: 'No API-key provided.', request_id: rid() });
      return;
    }
    if (!t) {
      json(res, 200, { output: { task_id: id, task_status: 'UNKNOWN' }, request_id: rid() });
      return;
    }
    t.polls++;
    if (t.mode === 'hang' || t.polls < TASK_POLLS) {
      json(res, 200, {
        output: { task_id: id, task_status: t.polls <= 1 ? 'PENDING' : 'RUNNING' },
        request_id: rid(),
      });
      return;
    }
    if (t.mode === 'task_failed') {
      json(res, 200, {
        output: { task_id: id, task_status: 'FAILED', code: 'InternalError', message: 'An internal error has occurred.' },
        request_id: rid(),
      });
      return;
    }
    json(res, 200, {
      output: { task_id: id, task_status: 'SUCCEEDED', rewrite_status: 'not_use', choices: choicesFor(id, base) },
      usage: QWEN_USAGE,
      request_id: rid(),
    });
    return;
  }

  if (req.method === 'POST' && u.pathname.endsWith('/services/aigc/multimodal-generation/generation')) {
    logHeaders(req, mode);
    await readBody(req);
    if (dashscopeError(res, mode)) return;
    if (mode === 'hang') return; // never answer; client must abort
    const id = `sync-${++taskSeq}`;
    json(res, 200, { output: { choices: choicesFor(id, base) }, usage: QWEN_USAGE, request_id: rid() });
    return;
  }

  if (req.method === 'POST' && isGenerationsPath(u.pathname)) {
    logHeaders(req, mode);
    await readBody(req); // drain

    if (mode === 'hang') {
      setTimeout(() => {
        // eventually respond after hang — client should have aborted
        if (!res.writableEnded) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              created: Math.floor(Date.now() / 1000),
              data: [{ b64_json: SAMPLE_B64 }],
            }),
          );
        }
      }, HANG_MS);
      return;
    }

    if (mode === '401') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: {
            message: 'Incorrect API key provided',
            type: 'invalid_request_error',
            param: null,
            code: 'invalid_api_key',
          },
        }),
      );
      return;
    }

    if (mode === '500') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: { message: 'Internal server error', type: 'server_error' },
        }),
      );
      return;
    }

    // success
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        created: Math.floor(Date.now() / 1000),
        data: [{ b64_json: SAMPLE_B64 }],
      }),
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `no route ${req.method} ${u.pathname}` } }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock-image-api listening on http://127.0.0.1:${PORT}`);
  console.log(`default mode=${DEFAULT_MODE} hangMs=${HANG_MS}`);
  console.log(`header log → ${HEADER_LOG}`);
});

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
 * CORS: fully open, allows Authorization header + OPTIONS preflight.
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

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, OpenAI-Beta, X-Requested-With',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parseMode(reqUrl) {
  const u = new URL(reqUrl, 'http://localhost');
  if (u.searchParams.get('mode')) return u.searchParams.get('mode');
  const m = u.pathname.match(/\/(success|401|500|hang)(?:\/|$)/);
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
    headers: { ...req.headers },
  };
  fs.appendFileSync(HEADER_LOG, JSON.stringify(entry) + '\n');
}

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

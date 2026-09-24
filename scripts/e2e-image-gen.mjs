#!/usr/bin/env node
/** E2E screenshots → /workspace/memory-train-web-verify/ */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = '/workspace/memory-train-web-verify';
const FAKE_KEY = 'sk-test-FAKE-1234';
const MOCK_PORT = 8787;
const APP_PORT = 4173;
const APP = `http://127.0.0.1:${APP_PORT}`;
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const HEADER_LOG = path.join(__dirname, 'mock-image-api-headers.log');
const VIEWPORT = { width: 430, height: 900 };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(HEADER_LOG, '');

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function waitHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`timeout waiting ${url}`));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

function spawnLogged(cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${path.basename(args[0] || cmd)}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${path.basename(args[0] || cmd)}:err] ${d}`));
  return child;
}

let mockProc = null;
let previewProc = null;

async function startMock(mode = 'success') {
  if (mockProc) {
    mockProc.kill('SIGTERM');
    await wait(400);
  }
  mockProc = spawnLogged('node', ['scripts/mock-image-api.mjs'], {
    PORT: String(MOCK_PORT),
    MOCK_MODE: mode,
    HANG_MS: '35000',
    HEADER_LOG,
  });
  await waitHttp(`${MOCK}/health`);
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
}

async function gotoHash(page, hashPath) {
  await page.goto(`${APP}/#${hashPath}`, { waitUntil: 'networkidle' });
  await wait(250);
}

async function saveSettings(page) {
  await gotoHash(page, '/settings');
  await page.locator('input[type="url"]').fill(`${MOCK}/v1`);
  const keyInput = page.locator('input[type="password"], input[placeholder*="sk"]').first();
  await keyInput.fill(FAKE_KEY);
  // ensure masked
  if ((await keyInput.getAttribute('type')) !== 'password') {
    await page.getByRole('button', { name: /隐藏 Key|显示 Key/ }).click();
  }
  await page.getByRole('button', { name: '保存' }).click();
  await page.locator('text=已配置').waitFor({ timeout: 5000 });
  await wait(300);
}

/** Always remount studio via home so phase resets to demo. */
async function openCreate(page) {
  await gotoHash(page, '/');
  await wait(200);
  await gotoHash(page, '/studio/association');
  const start = page.getByRole('button', { name: '轮到我造' });
  await start.waitFor({ timeout: 8000 });
  await start.click();
  await page.locator('textarea').waitFor({ timeout: 5000 });
}

async function generateFromCreate(page, sentence) {
  await openCreate(page);
  await page.locator('textarea').fill(sentence);
  await page.getByRole('button', { name: '生成画面' }).click();
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  // kill anything lingering on ports
  try {
    spawn('bash', ['-lc', `fuser -k ${APP_PORT}/tcp ${MOCK_PORT}/tcp 2>/dev/null || true`]);
  } catch {}
  await wait(500);

  previewProc = spawnLogged('npx', [
    'vite',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(APP_PORT),
  ]);
  await waitHttp(APP);
  await startMock('success');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // 01
  await saveSettings(page);
  const keyType = await page.locator('input[type="password"]').first().getAttribute('type');
  await shot(page, '01-settings-configured.png');
  record('01-settings-configured', (await page.locator('text=已配置').count()) > 0 && keyType === 'password');

  // 02
  await generateFromCreate(page, '小李把图书馆顶在头上当帽子');
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  await wait(400);
  await shot(page, '02-generated.png');
  record('02-generated', (await page.locator('img[alt="生成画面"]').count()) > 0);

  // 03
  await page.getByRole('button', { name: '换一张' }).click();
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  await wait(400);
  await shot(page, '03-swapped.png');
  record('03-swapped', (await page.locator('img[alt="生成画面"]').count()) > 0);

  // 04
  await page.getByRole('button', { name: '就用这张' }).click();
  await wait(400);
  await shot(page, '04-kept.png');
  record('04-kept', (await page.locator('text=对比（不计分）').count()) > 0);

  async function failCase(file, mode, name) {
    await startMock(mode);
    await page.evaluate(() => localStorage.removeItem('mt-image-gen-daily'));
    await saveSettings(page);
    await generateFromCreate(page, `失败场景 ${mode} ${Date.now()}`);
    const timeout = mode === 'hang' ? 35000 : 15000;
    await page.locator('text=生成失败，先用示意图').waitFor({ timeout });
    await wait(300);
    await shot(page, file);
    record(name, (await page.locator('text=生成失败，先用示意图').count()) > 0);
  }

  await failCase('05-fail-401.png', '401', '05-fail-401');
  await failCase('06-fail-500.png', '500', '06-fail-500');
  await failCase('07-fail-timeout.png', 'hang', '07-fail-timeout');

  // 08
  await startMock('success');
  await page.evaluate(() => localStorage.removeItem('mt-image-gen-daily'));
  await saveSettings(page);
  await generateFromCreate(page, '换满三次专用句子');
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  for (let i = 0; i < 3; i++) {
    const btn = page.getByRole('button', { name: '换一张' });
    if (await btn.isDisabled()) break;
    await btn.click();
    await wait(900);
  }
  await page.locator('text=这句已换 3 次').waitFor({ timeout: 10000 });
  await shot(page, '08-swap-capped.png');
  record(
    '08-swap-capped',
    (await page.getByRole('button', { name: '换一张' }).isDisabled()) &&
      (await page.locator('text=这句已换 3 次').count()) > 0,
  );

  // 09
  await page.evaluate((date) => {
    localStorage.setItem('mt-image-gen-daily', JSON.stringify({ date, count: 20 }));
  }, todayKey());
  await openCreate(page);
  await page.locator('textarea').fill('今日额度已满测试句');
  await wait(500);
  await shot(page, '09-daily-cap.png');
  const genDisabled = await page.getByRole('button', { name: '生成画面' }).isDisabled();
  const dailyHint = (await page.locator('text=今日生成次数已用完，明天再来').count()) > 0;
  record('09-daily-cap', genDisabled && dailyHint, `disabled=${genDisabled} hint=${dailyHint}`);


  // 11 textarea focus
  await openCreate(page);
  await page.locator('textarea.assoc-sentence-input').click();
  await page.locator('textarea.assoc-sentence-input').focus();
  await wait(200);
  await shot(page, '11-input-focus.png');
  const focused = await page.locator('textarea.assoc-sentence-input:focus').count();
  record('11-input-focus', focused > 0, `focused=${focused}`);

  // 10 network
  await page.evaluate(() => localStorage.removeItem('mt-image-gen-daily'));
  await startMock('success');
  await saveSettings(page);
  const netLog = [];
  const onReq = (req) => {
    netLog.push({
      url: req.url(),
      method: req.method(),
      authorization: req.headers()['authorization'] || '',
    });
  };
  page.on('request', onReq);
  await generateFromCreate(page, '网络抓包验证句子');
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  await wait(400);
  page.off('request', onReq);

  const mockHeaderLines = fs.existsSync(HEADER_LOG)
    ? fs.readFileSync(HEADER_LOG, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  const authOnMock = netLog.filter((r) => r.url.includes('/images/generations'));
  const authElsewhere = netLog.filter(
    (r) => r.authorization && !r.url.includes('/images/generations'),
  );
  const mockHasBearer = authOnMock.some((r) => r.authorization === `Bearer ${FAKE_KEY}`);
  const elsewhereClean = authElsewhere.length === 0;

  const html = `<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"/>
<title>Key location proof</title>
<body style="font-family:sans-serif;padding:16px;max-width:820px">
<h1>10 — Key location proof</h1>
<p>Fake key: <code>${FAKE_KEY}</code></p>
<h2>Playwright request events</h2>
<pre style="background:#f1f5f9;padding:12px;white-space:pre-wrap;font-size:12px">${netLog
    .map((r) => `${r.method} ${r.url}\n  Authorization: ${r.authorization || '(none)'}`)
    .join('\n\n')}</pre>
<h2>Mock server header log (tail)</h2>
<pre style="background:#f1f5f9;padding:12px;white-space:pre-wrap;font-size:12px">${mockHeaderLines
    .slice(-8)
    .map((line) => {
      try {
        const j = JSON.parse(line);
        return `${j.ts} ${j.method} ${j.url}\n  authorization: ${j.headers?.authorization || '(none)'}`;
      } catch {
        return line;
      }
    })
    .join('\n\n')}</pre>
<p><b>Assertion:</b> Bearer only on mock /images/generations —
mockHasBearer=${mockHasBearer}, elsewhereClean=${elsewhereClean}</p>
</body></html>`;
  fs.writeFileSync(path.join(OUT, '10-network-proof.html'), html);
  await page.setContent(html, { waitUntil: 'load' });
  await shot(page, '10-network.png');
  record('10-network', mockHasBearer && elsewhereClean, `mock=${authOnMock.length} otherAuth=${authElsewhere.length}`);

  await browser.close();
  if (mockProc) mockProc.kill('SIGTERM');
  if (previewProc) previewProc.kill('SIGTERM');

  fs.writeFileSync(
    path.join(OUT, 'SUMMARY.txt'),
    results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}\t${r.name}\t${r.detail}`).join('\n') + '\n',
  );
  console.log('\nSummary →', path.join(OUT, 'SUMMARY.txt'));
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  if (mockProc) mockProc.kill('SIGTERM');
  if (previewProc) previewProc.kill('SIGTERM');
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Issue #2 E2E: Tongyi (DashScope qwen-image-3.0) against the local mock.
 * Screenshots + logs → /workspace/memory-train-web-verify/issue-2/
 * Needs `npm run build` first (serves dist via vite preview). Uses a FAKE key only.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.OUT_DIR || '/workspace/memory-train-web-verify/issue-2';
const FAKE_KEY = 'sk-test-FAKE-tongyi-0000';
const MOCK_PORT = 8788;
const APP_PORT = 4174;
const APP = `http://127.0.0.1:${APP_PORT}`;
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const HEADER_LOG = path.join(OUT, 'mock-dashscope-requests.log');
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
  const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  child.stdout.on('data', (d) => process.stdout.write(`[${path.basename(args[0] || cmd)}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${path.basename(args[0] || cmd)}:err] ${d}`));
  return child;
}

/** Kill the whole process group (npx → vite) so the script can exit. */
function killTree(child) {
  if (!child) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

let mockProc = null;
let previewProc = null;

async function startMock(mode = 'success') {
  if (mockProc) {
    killTree(mockProc);
    await wait(400);
  }
  mockProc = spawnLogged('node', ['scripts/mock-image-api.mjs'], {
    PORT: String(MOCK_PORT),
    MOCK_MODE: mode,
    TASK_POLLS: '2',
    HEADER_LOG,
  });
  await waitHttp(`${MOCK}/health`);
}

const shot = (page, file) => page.screenshot({ path: path.join(OUT, file), fullPage: true });

async function gotoHash(page, hashPath) {
  await page.goto(`${APP}/#${hashPath}`, { waitUntil: 'networkidle' });
  await wait(250);
}

async function saveTongyiSettings(page) {
  await gotoHash(page, '/settings');
  await page.getByLabel('服务商').selectOption('tongyi');
  await page.getByLabel('接口地址').fill(`${MOCK}/api/v1`);
  await page.locator('input[type="password"]').first().fill(FAKE_KEY);
  await page.getByRole('button', { name: '保存' }).click();
  await page.locator('text=已配置').waitFor({ timeout: 5000 });
  await wait(300);
}

async function openCreate(page) {
  await gotoHash(page, '/');
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

const isMockImage = async (page) => {
  const src = await page.locator('img[alt="生成画面"]').first().getAttribute('src').catch(() => null);
  return { ok: !!src && src.startsWith(`${MOCK}/oss/`), src };
};

async function main() {
  spawn('bash', ['-lc', `fuser -k ${APP_PORT}/tcp ${MOCK_PORT}/tcp 2>/dev/null || true`]);
  await wait(500);
  previewProc = spawnLogged('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(APP_PORT), '--strictPort']);
  await waitHttp(APP);
  await startMock('success');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  // 00 migration: pre-#2 prefs keep working as OpenAI-compatible
  await gotoHash(page, '/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('mt-image-gen-prefs', JSON.stringify({ baseUrl: 'https://my.proxy.example/v1', apiKey: 'sk-old-FAKE' }));
  });
  await gotoHash(page, '/settings');
  const migProvider = await page.getByLabel('服务商').inputValue();
  const migModel = await page.getByLabel('模型').inputValue();
  const migUrl = await page.getByLabel('接口地址').inputValue();
  await shot(page, '00-settings-migrated-openai.png');
  record('00-migration-old-prefs', migProvider === 'openai' && migModel === 'gpt-image-1' && migUrl === 'https://my.proxy.example/v1' && (await page.locator('text=已配置').count()) > 0, `provider=${migProvider} model=${migModel} url=${migUrl}`);

  // 01 choosing 通义 autofills model + official endpoint
  await page.evaluate(() => localStorage.clear());
  await gotoHash(page, '/settings');
  await page.getByLabel('服务商').selectOption('tongyi');
  const model = await page.getByLabel('模型').inputValue();
  const endpoint = await page.getByLabel('接口地址').inputValue();
  await shot(page, '01-settings-tongyi-autofill.png');
  record('01-tongyi-autofill', model === 'qwen-image-3.0' && endpoint === 'https://dashscope.aliyuncs.com/api/v1', `model=${model} endpoint=${endpoint}`);

  // 02 configured against mock
  await saveTongyiSettings(page);
  await shot(page, '02-settings-tongyi-configured.png');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mt-image-gen-prefs') || '{}'));
  record('02-tongyi-saved', stored.provider === 'tongyi' && stored.model === 'qwen-image-3.0', `stored provider=${stored.provider} model=${stored.model}`);

  // 03 generate (async submit + polling)
  const netLog = [];
  const onReq = (req) => netLog.push({ method: req.method(), url: req.url(), headers: req.headers() });
  page.on('request', onReq);
  await generateFromCreate(page, '小李把图书馆顶在头上当帽子');
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  await wait(400);
  await shot(page, '03-generated.png');
  const g = await isMockImage(page);
  const submits = netLog.filter((r) => r.method === 'POST' && r.url.endsWith('/services/aigc/image-generation/generation'));
  const polls = netLog.filter((r) => r.method === 'GET' && r.url.includes('/api/v1/tasks/'));
  record('03-generated-async-polled', g.ok && submits.length === 1 && polls.length >= 2 && submits[0].headers['x-dashscope-async'] === 'enable', `submits=${submits.length} polls=${polls.length}`);

  // 04 换一张
  await page.getByRole('button', { name: '换一张' }).click();
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  await wait(400);
  await shot(page, '04-swapped.png');
  const sw = await isMockImage(page);
  record('04-swapped', sw.ok && sw.src !== g.src, `new src differs=${sw.src !== g.src}`);

  // 05 就用这张 → stored in mt-confirmed-scenes
  await page.getByRole('button', { name: '就用这张' }).click();
  await wait(400);
  await shot(page, '05-kept.png');
  const confirmed = await page.evaluate(() => JSON.parse(localStorage.getItem('mt-confirmed-scenes') || '[]'));
  record('05-kept-confirmed', confirmed.length === 1 && confirmed[0].url === sw.src, `confirmed=${confirmed.length}`);
  page.off('request', onReq);

  // 06 palace tray shows the confirmed Tongyi image
  await gotoHash(page, '/studio/palace');
  await page.locator('.btn-primary').first().click();
  await page.locator('[data-testid="scene-tray"]').waitFor({ timeout: 5000 });
  await wait(300);
  await shot(page, '06-palace-tray.png');
  const traySrc = await page.locator('.scene-thumb img').first().getAttribute('src').catch(() => null);
  record('06-palace-tray', traySrc === sw.src, `tray img=${traySrc ? 'mock oss url' : 'none'}`);

  // 07–10 failures fall back to the SVG illustration
  async function failCase(file, mode, name) {
    await startMock(mode);
    await page.evaluate(() => localStorage.removeItem('mt-image-gen-daily'));
    await saveTongyiSettings(page);
    const t0 = Date.now();
    await generateFromCreate(page, `失败场景 ${mode}`);
    await page.locator('text=生成失败，先用示意图').waitFor({ timeout: 30000 });
    const elapsed = Date.now() - t0;
    await wait(300);
    await shot(page, file);
    const src = await page.locator('img[alt="生成画面"]').first().getAttribute('src');
    const isSvg = !!src && src.startsWith('data:image/svg+xml');
    const noKeep = (await page.getByRole('button', { name: '就用这张' }).count()) === 0 ||
      !(await page.evaluate(() => (JSON.parse(localStorage.getItem('mt-confirmed-scenes') || '[]')).some((s) => s.sentence?.startsWith('失败场景'))));
    record(name, isSvg && noKeep, `svg=${isSvg} elapsed=${(elapsed / 1000).toFixed(1)}s`);
    return elapsed;
  }

  await failCase('07-fail-401.png', '401', '07-fail-401');
  await failCase('08-fail-500.png', '500', '08-fail-500');
  const hangMs = await failCase('09-fail-timeout.png', 'hang', '09-fail-timeout');
  record('09b-timeout-total-budget', hangMs >= 19000 && hangMs < 24000, `${(hangMs / 1000).toFixed(1)}s (budget 20s)`);
  await failCase('10-fail-task-failed.png', 'task_failed', '10-fail-task-failed');

  // 11 key only went to the configured endpoint
  const allReqs = [];
  page.on('request', (r) => allReqs.push({ url: r.url(), auth: r.headers()['authorization'] || '' }));
  await startMock('success');
  await saveTongyiSettings(page);
  await generateFromCreate(page, '网络抓包验证句子');
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  const withAuth = allReqs.filter((r) => r.auth);
  const leaked = withAuth.filter((r) => !r.url.startsWith(`${MOCK}/api/v1/`));
  const proof = [
    '# Requests carrying Authorization (value redacted)',
    ...withAuth.map((r) => `${r.url}  Authorization: Bearer ***${r.auth.slice(-4)}`),
    '',
    `# Requests outside ${MOCK}/api/v1/ with Authorization: ${leaked.length}`,
  ].join('\n');
  fs.writeFileSync(path.join(OUT, '11-network-proof.txt'), proof + '\n');
  record('11-key-only-to-endpoint', withAuth.length >= 2 && leaked.length === 0, `auth requests=${withAuth.length} elsewhere=${leaked.length}`);

  record('12-no-page-errors', consoleErrors.length === 0, consoleErrors.join(' | '));

  await browser.close();
  killTree(mockProc);
  killTree(previewProc);
  fs.writeFileSync(path.join(OUT, 'SUMMARY.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}\t${r.name}\t${r.detail}`).join('\n') + '\n');
  console.log('\nSummary →', path.join(OUT, 'SUMMARY.txt'));
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  killTree(mockProc);
  killTree(previewProc);
  process.exit(1);
});

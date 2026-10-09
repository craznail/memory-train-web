#!/usr/bin/env node
/**
 * Palace local-copy E2E (issue #2 follow-up): confirmed images survive remote expiry.
 * Needs `npm run build`. Mock only, FAKE key. Output → /workspace/memory-train-web-verify/issue-2/scene-cache/
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.OUT_DIR || '/workspace/memory-train-web-verify/issue-2/scene-cache';
const FAKE_KEY = 'sk-test-FAKE-tongyi-0000';
const MOCK_PORT = 8789;
const APP_PORT = 4176;
const APP = `http://127.0.0.1:${APP_PORT}`;
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const LOG = path.join(OUT, 'mock-requests.log');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(LOG, '');
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function waitHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () =>
      http.get(url, (res) => { res.resume(); resolve(); }).on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`timeout ${url}`));
        else setTimeout(tick, 200);
      });
    tick();
  });
}
const spawnGroup = (cmd, args, env = {}) =>
  spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'ignore', detached: true });
const killTree = (c) => { try { process.kill(-c.pid, 'SIGTERM'); } catch {} };
const control = (q) =>
  new Promise((resolve, reject) => {
    const req = http.request(`${MOCK}/__control?${q}`, { method: 'POST' }, (res) => { res.resume(); res.on('end', resolve); });
    req.on('error', reject);
    req.end();
  });

const shot = (page, f) => page.screenshot({ path: path.join(OUT, f), fullPage: true });
async function gotoHash(page, h) {
  await page.goto(`${APP}/#${h}`, { waitUntil: 'networkidle' });
  await wait(250);
}
const scenes = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mt-confirmed-scenes') || '[]'));
async function waitScene(page, pred, ms = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await scenes(page);
    if (s.length && pred(s[s.length - 1])) return s[s.length - 1];
    await wait(150);
  }
  return (await scenes(page)).at(-1) ?? null;
}

async function settings(page) {
  await gotoHash(page, '/settings');
  await page.getByLabel('服务商').selectOption('tongyi');
  await page.getByLabel('接口地址').fill(`${MOCK}/api/v1`);
  await page.locator('input[type="password"]').first().fill(FAKE_KEY);
  await page.getByRole('button', { name: '保存' }).click();
  await page.locator('text=已配置').waitFor({ timeout: 5000 });
}

async function generateAndKeep(page, sentence) {
  await gotoHash(page, '/');
  await gotoHash(page, '/studio/association');
  await page.getByRole('button', { name: '轮到我造' }).click();
  await page.locator('textarea').fill(sentence);
  await page.getByRole('button', { name: '生成画面' }).click();
  await page.getByRole('button', { name: '就用这张' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: '就用这张' }).click();
}

/** Remount the palace (fresh resolve) and move to the 放置 phase. */
async function openPalace(page) {
  await gotoHash(page, '/');
  await gotoHash(page, '/studio/palace');
  await page.locator('.btn-primary').first().click();
  await page.locator('[data-testid="scene-tray"]').waitFor({ timeout: 5000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="scene-thumb-img"]')].every((el) => el.dataset.state !== 'loading'),
    null,
    { timeout: 20000 },
  );
  await wait(600);
}

async function placeFirstOnPeg(page) {
  await page.locator('[data-testid="scene-thumb"]').last().click();
  await page.locator('button.card').first().click();
  await page.locator('[data-testid="peg-thumb"]').first().waitFor({ timeout: 5000 });
  await wait(600);
}

const imgInfo = (page, testId) =>
  page.evaluate((id) => {
    const els = [...document.querySelectorAll(`[data-testid="${id}"]`)];
    const el = els[els.length - 1];
    if (!el) return null;
    return {
      tag: el.tagName,
      state: el.dataset.state,
      scheme: (el.getAttribute('src') || '').split(':')[0],
      isSvg: (el.getAttribute('src') || '').startsWith('data:image/svg'),
      loaded: el.tagName === 'IMG' ? el.complete && el.naturalWidth > 0 : false,
    };
  }, testId);

const allImagesHealthy = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="scene-thumb-img"], [data-testid="peg-thumb"]')].every(
      (el) => el.tagName === 'IMG' && el.complete && el.naturalWidth > 0,
    ),
  );

const idbInfo = (page, id) =>
  page.evaluate(async (key) => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('mt-scene-images', 1);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const blob = await new Promise((res) => {
      const r = db.transaction('images').objectStore('images').get(key);
      r.onsuccess = () => res(r.result ?? null);
      r.onerror = () => res(null);
    });
    db.close();
    if (!blob) return null;
    const bmp = await createImageBitmap(blob);
    return { type: blob.type, size: blob.size, width: bmp.width, height: bmp.height };
  }, id);

async function main() {
  spawn('bash', ['-lc', `fuser -k ${APP_PORT}/tcp ${MOCK_PORT}/tcp 2>/dev/null || true`]);
  await wait(500);
  const preview = spawnGroup('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(APP_PORT), '--strictPort']);
  const mock = spawnGroup('node', ['scripts/mock-image-api.mjs'], { PORT: String(MOCK_PORT), MOCK_MODE: 'success', TASK_POLLS: '1', HEADER_LOG: LOG });
  await waitHttp(APP);
  await waitHttp(`${MOCK}/health`);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })).newPage();
  const ossHits = [];
  page.on('request', (r) => { if (r.url().includes('/oss/')) ossHits.push(r.url()); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // ---- A: confirm → local WebP copy → remote 404 → palace still renders from IndexedDB
  await settings(page);
  await generateAndKeep(page, '小李把图书馆顶在头上当帽子');
  const a = await waitScene(page, (s) => s.localCached === true);
  const idbA = a ? await idbInfo(page, a.id) : null;
  record('A1-cached-on-confirm', !!a?.localCached && !a?.temporary, `localCached=${a?.localCached}`);
  record('A2-webp-le-512', idbA?.type === 'image/webp' && Math.max(idbA.width, idbA.height) <= 512,
    idbA ? `${idbA.type} ${idbA.width}x${idbA.height} ${idbA.size}B (source 1024x1024 png)` : 'missing');
  await control('oss=404');
  ossHits.length = 0;
  await openPalace(page);
  const trayA = await imgInfo(page, 'scene-thumb-img');
  await placeFirstOnPeg(page);
  const pegA = await imgInfo(page, 'peg-thumb');
  await shot(page, 'A-remote-404-palace-from-indexeddb.png');
  record('A3-tray-from-idb-after-404', trayA?.scheme === 'blob' && trayA.loaded, JSON.stringify(trayA));
  record('A4-peg-from-idb-after-404', pegA?.scheme === 'blob' && pegA.loaded, JSON.stringify(pegA));
  record('A5-no-remote-fetch-in-palace', ossHits.length === 0, `oss requests=${ossHits.length}`);
  record('A6-no-temp-badge', (await page.locator('[data-testid="scene-temp-badge"]').count()) === 0);

  // ---- B: CORS-blocked download → 临时图 → expiry shows the sentence illustration
  await page.evaluate(() => localStorage.removeItem('mt-confirmed-scenes'));
  await control('oss=200&ossCors=0');
  await generateAndKeep(page, '猫咪坐在书堆上看月亮');
  const b = await waitScene(page, (s) => s.temporary === true);
  record('B1-cors-fail-marked-temporary', !!b?.temporary && !b?.localCached, `temporary=${b?.temporary}`);
  await openPalace(page);
  const trayB = await imgInfo(page, 'scene-thumb-img');
  const badgeB = await page.locator('[data-testid="scene-temp-badge"]').count();
  await shot(page, 'B1-temporary-live.png');
  record('B2-temporary-shows-remote-with-badge', trayB?.scheme === 'http' && trayB.loaded && badgeB === 1, `${JSON.stringify(trayB)} badge=${badgeB}`);
  await control('oss=404');
  await openPalace(page);
  const trayB2 = await imgInfo(page, 'scene-thumb-img');
  await placeFirstOnPeg(page);
  const pegB2 = await imgInfo(page, 'peg-thumb');
  await shot(page, 'B2-temporary-expired-illustration.png');
  record('B3-expired-tray-illustration', trayB2?.state === 'fallback' && trayB2.isSvg && trayB2.loaded, JSON.stringify(trayB2));
  record('B4-expired-peg-illustration', pegB2?.state === 'fallback' && pegB2.isSvg && pegB2.loaded, JSON.stringify(pegB2));
  record('B5-no-broken-images', await allImagesHealthy(page));

  // ---- C: legacy record (remote URL only, pre-cache) is migrated on first view
  await control('oss=200&ossCors=1');
  await page.evaluate((u) => {
    localStorage.setItem('mt-confirmed-scenes', JSON.stringify([
      { id: 'scene-legacy-1', url: u, sentence: '旧记录：小狗在沙发上打鼓', confirmedAt: '2026-10-01T08:00:00.000Z' },
    ]));
  }, `${MOCK}/oss/legacy-1.png?Expires=1`);
  await openPalace(page);
  const c = await waitScene(page, (s) => s.localCached === true);
  const trayC = await imgInfo(page, 'scene-thumb-img');
  record('C1-legacy-migrated-on-view', !!c?.localCached && trayC?.scheme === 'blob' && trayC.loaded, `localCached=${c?.localCached} ${JSON.stringify(trayC)}`);
  await control('oss=404');
  await openPalace(page);
  const trayC2 = await imgInfo(page, 'scene-thumb-img');
  await shot(page, 'C-legacy-migrated-then-404.png');
  record('C2-legacy-survives-404', trayC2?.scheme === 'blob' && trayC2.loaded, JSON.stringify(trayC2));

  // ---- D: legacy record already expired → 临时图 + illustration, never broken
  await page.evaluate((u) => {
    localStorage.setItem('mt-confirmed-scenes', JSON.stringify([
      { id: 'scene-legacy-2', url: u, sentence: '旧记录：已过期的图', confirmedAt: '2026-09-01T08:00:00.000Z' },
    ]));
  }, `${MOCK}/oss/legacy-2.png?Expires=1`);
  await openPalace(page);
  const d = (await scenes(page))[0];
  const trayD = await imgInfo(page, 'scene-thumb-img');
  await placeFirstOnPeg(page);
  await shot(page, 'D-legacy-expired-illustration.png');
  record('D1-legacy-expired-temporary-illustration', d?.temporary === true && trayD?.state === 'fallback' && trayD.isSvg, `${JSON.stringify(trayD)} temporary=${d?.temporary}`);
  record('D2-no-broken-images', await allImagesHealthy(page));

  record('Z-no-page-errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  killTree(mock);
  killTree(preview);
  fs.writeFileSync(path.join(OUT, 'SUMMARY.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}\t${r.name}\t${r.detail}`).join('\n') + '\n');
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  spawn('bash', ['-lc', `fuser -k ${APP_PORT}/tcp ${MOCK_PORT}/tcp 2>/dev/null || true`]);
  process.exit(1);
});

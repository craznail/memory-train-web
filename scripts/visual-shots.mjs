#!/usr/bin/env node
/**
 * Visual v2 evidence: screenshot pages from `dist/` with Playwright.
 * Usage: node scripts/visual-shots.mjs <outDir> [label]
 *   needs `npm run build` first. No network, no keys.
 * Writes <outDir>/<label>-<scene>-<w>.png and <outDir>/<label>-overflow.json
 * (page scrollWidth vs viewport → no horizontal page scroll).
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(process.env.DIST || path.join(__dirname, '..', 'dist'));
const OUT = path.resolve(process.argv[2] || '/tmp/visual-shots');
const LABEL = process.argv[3] || 'after';
const ONLY = (process.env.SCENES || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(DIST, p === '/' ? 'index.html' : p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const APP = `http://127.0.0.1:${server.address().port}`;

const today = (() => { const d = new Date('2026-10-09T15:00:00+08:00'); return '2026-10-09'; })();
const SCORE = { overall: 72, auditory: 75, antiInterference: 68, weakPoints: [], date: '2026-10-08T12:00:00.000Z', paperId: 'p1' };
const SEED = {
  'memory-train-score-history': JSON.stringify({ latest: SCORE, history: [SCORE] }),
  [`memory-train-daily-${today}`]: JSON.stringify({ date: today, currentIndex: 2, completed: false, rounds: [
    { paperId: 'a', withInterference: true, done: true }, { paperId: 'b', withInterference: false, done: true }, { paperId: 'c', withInterference: false, done: false }] }),
};

const DONE = { ...SEED, [`memory-train-daily-${today}`]: JSON.stringify({ date: today, currentIndex: 3, completed: true, rounds: [
  { paperId: 'a', withInterference: true, done: true }, { paperId: 'b', withInterference: false, done: true }, { paperId: 'c', withInterference: false, done: true }] }) };
const NO_PLAN = { 'memory-train-score-history': SEED['memory-train-score-history'] };

const WIDTHS = { m: { width: 375, height: 812 }, s: { width: 320, height: 700 }, d: { width: 1280, height: 900 } };
const SCENES = [
  { name: 'home', route: '/', seed: SEED, widths: ['m', 's', 'd'] },
  { name: 'home-empty', route: '/', seed: {}, widths: ['m'] },
  { name: 'home-state0-noplan', route: '/', seed: NO_PLAN, widths: ['m', 's'] },
  { name: 'home-state3-done', route: '/', seed: DONE, widths: ['m', 's'] },
  { name: 'home-reduced', route: '/', seed: SEED, widths: ['m'], reduced: true },
  { name: 'methods', route: '/methods', seed: {}, widths: ['m', 's', 'd'] },
  { name: 'studio-imagery', route: '/studio/imagery', seed: {}, widths: ['m'] },
  { name: 'studio-encoding', route: '/studio/encoding', seed: {}, widths: ['m'] },
  { name: 'studio-association', route: '/studio/association', seed: {}, widths: ['m'] },
  { name: 'studio-palace', route: '/studio/palace', seed: {}, widths: ['m', 's', 'd'] },
  { name: 'report-empty', route: '/report', seed: {}, widths: ['m', 'd'] },
  { name: 'report', route: '/report', seed: SEED, widths: ['m'] },
  { name: 'settings', route: '/settings', seed: {}, widths: ['m'] },
];

const browser = await chromium.launch();
const overflow = [];
for (const sc of SCENES) {
  if (ONLY.length && !ONLY.includes(sc.name)) continue;
  for (const w of sc.widths) {
    const ctx = await browser.newContext({ viewport: WIDTHS[w], deviceScaleFactor: 2, reducedMotion: sc.reduced ? 'reduce' : 'no-preference', locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-10-09T15:00:00+08:00'));
    await page.addInitScript((seed) => { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); } }, sc.seed);
    await page.goto(`${APP}/#${sc.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, keys: Object.keys(localStorage).sort() }));
    overflow.push({ scene: sc.name, width: WIDTHS[w].width, ...m, horizontalScroll: m.scrollWidth > m.clientWidth });
    const file = `${LABEL}-${sc.name}-${WIDTHS[w].width}.png`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    console.log(file, m.scrollWidth > m.clientWidth ? 'H-SCROLL!' : 'ok');
    await ctx.close();
  }
}
fs.writeFileSync(path.join(OUT, `${LABEL}-overflow.json`), JSON.stringify(overflow, null, 2));
await browser.close();
server.close();

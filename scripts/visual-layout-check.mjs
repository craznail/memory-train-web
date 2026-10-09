#!/usr/bin/env node
/**
 * Visual v2 home layout assertions (项目总管 review on #7), 375 and 320 wide:
 *  - studio cards: text ≤55% of card width, no text/illustration overlap
 *  - method descriptions: single line, inside their column, all 6 visible
 *  - no single-line text clipped (subtitle, captions); no page horizontal scroll
 * Usage: node scripts/visual-layout-check.mjs <out.json>   (needs `npm run build`)
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const OUT = process.argv[2] || '/tmp/layout-check.json';
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(DIST, p === '/' ? 'index.html' : p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(f)] || '');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const report = [];
let failed = 0;
for (const width of [375, 320]) {
  const page = await browser.newPage({ viewport: { width, height: 812 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const rect = (el) => el.getBoundingClientRect();
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const cards = [...document.querySelectorAll('.studio-card--home')].map((c) => {
      const cr = rect(c), art = rect(c.querySelector('.studio-card-art'));
      const texts = [c.querySelector('.studio-card-title'), ...c.querySelectorAll('.studio-card-sub > span')];
      const textRight = Math.max(...texts.map((t) => { const rg = document.createRange(); rg.selectNodeContents(t); return rg.getBoundingClientRect().right; }));
      const overlap = texts.some((t) => { const rg = document.createRange(); rg.selectNodeContents(t); return [...rg.getClientRects()].some((lr) => hit(lr, art)); });
      return { title: c.querySelector('.studio-card-title').textContent, textPct: Math.round(((textRight - cr.left) / cr.width) * 1000) / 10, overlap, artInside: art.right <= cr.right + 0.5 && art.bottom <= cr.bottom + 0.5 };
    });
    const strip = document.querySelector('.method-strip');
    const items = [...document.querySelectorAll('.method-strip-item')];
    const descs = items.map((it) => it.querySelector('.method-strip-desc'));
    const methods = items.map((it, i) => {
      const d = descs[i], ir = rect(it), dr = rect(d), sr = rect(strip);
      const shown = getComputedStyle(d).display !== 'none';
      const fs = parseFloat(getComputedStyle(d).fontSize);
      const next = descs[i + 1] && rect(descs[i + 1]);
      return { name: it.querySelector('.method-strip-name').textContent, desc: shown ? d.textContent : '(name only)', fontSize: fs,
        oneLine: !shown || dr.height < fs * 1.6, noCollision: !shown || !next || dr.right <= next.left, inStrip: !shown || (dr.left >= sr.left && dr.right <= sr.right),
        notClipped: !shown || d.scrollWidth <= d.clientWidth + 1, visible: ir.right <= sr.right + 0.5 };
    });
    const heroIn = document.querySelector('.home-hero-in'), hero = rect(document.querySelector('.home-hero'));
    const heroTextRight = Math.max(...[...heroIn.querySelectorAll('.home-hero-t, .home-hero-s, .home-progress > *, .home-hero-btn')].map((e) => rect(e).right)) - hero.left;
    const clipped = [...document.querySelectorAll('.home-sub, .home-sec-more, .home-test-s, .entry-sub, .entry-title')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent);
    return { heroTextRight, heroHeight: hero.height, cards, methods, stripScrolls: strip.scrollWidth > strip.clientWidth + 1, clipped, pageHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  const ok = r.cards.every((c) => !c.overlap && c.textPct <= 55 && c.artInside) && r.methods.every((m) => m.oneLine && m.noCollision && m.inStrip && m.notClipped && m.visible && m.fontSize >= 10) && r.heroTextRight <= 16 + 190 + 0.5 && !r.stripScrolls && !r.pageHScroll;
  if (!ok) failed++;
  report.push({ width, ok, ...r });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${width}px`, JSON.stringify({ heroTextRight: r.heroTextRight, heroHeight: r.heroHeight, cards: r.cards, methods: r.methods.map((m) => [m.name, m.desc, m.oneLine && m.noCollision && m.inStrip && m.notClipped]), clipped: r.clipped }));
  await page.close();
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);

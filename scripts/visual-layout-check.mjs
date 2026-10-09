#!/usr/bin/env node
/**
 * Visual v2 home layout assertions (项目总管 review on #7), 375 and 320 wide:
 *  - studio cards (v3): art ≈50% card width (≈42% at 320), full card height, anchored right/bottom,
 *    left-edge fade; text only over the faded edge (never the opaque art); descriptions ≤2 lines (≤3 at 320);
 *    same-row cards equal height; WCAG AA contrast measured on the real pixels behind the text
 *  - hero (follow-up to #3): gap between the hero text boxes and the elephant (trunk/face), using the
 *    subject mask from scripts/hero-subject-mask.json mapped through object-fit: cover + object-position;
 *    measured for all three progress states; subtitle gap must be ≥12px at 320
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
const HERO_MASK = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'hero-subject-mask.json'), 'utf8'));
const DAY = '2026-10-09';
const SCORE = { overall: 72, auditory: 75, antiInterference: 68, weakPoints: [], date: '2026-10-08T12:00:00.000Z', paperId: 'p1' };
const HIST = { 'memory-train-score-history': JSON.stringify({ latest: SCORE, history: [SCORE] }) };
const plan = (n) => ({ ...HIST, [`memory-train-daily-${DAY}`]: JSON.stringify({ date: DAY, currentIndex: n, completed: n === 3,
  rounds: [0, 1, 2].map((i) => ({ paperId: 'abc'[i], withInterference: i === 0, done: i < n })) }) });
const HERO_STATES = [['0/3 开始', HIST], ['2/3 继续', plan(2)], ['3/3 今日已完成', plan(3)]];

async function heroGaps(browser, width) {
  const out = [];
  for (const [state, seed] of HERO_STATES) {
    const ctx = await browser.newContext({ viewport: { width, height: 812 }, deviceScaleFactor: 2, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-10-09T15:00:00+08:00'));
    await page.addInitScript((sd) => { localStorage.clear(); for (const [k, v] of Object.entries(sd)) localStorage.setItem(k, v); }, seed);
    await page.goto(`http://127.0.0.1:${server.address().port}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const g = await page.evaluate((mask) => {
      const img = document.querySelector('.home-hero-bg'); const ir = img.getBoundingClientRect();
      const cs = getComputedStyle(img); const [px, py] = cs.objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const s = Math.max(ir.width / mask.width, ir.height / mask.height);
      const ox = ir.left + (ir.width - mask.width * s) * px, oy = ir.top + (ir.height - mask.height * s) * py;
      const subjectLeftAt = (top, bottom) => { let m = Infinity;
        for (let y = Math.max(0, Math.floor((top - oy) / s)); y <= Math.min(mask.height - 1, Math.ceil((bottom - oy) / s)); y++) { const lx = mask.leftmostX[y]; if (lx != null) m = Math.min(m, ox + lx * s); }
        return m; };
      // nearest elephant pixel in any direction (Euclidean) from the text box, plus the same-row horizontal gap
      const nearest = (r) => { let d = Infinity;
        mask.leftmostX.forEach((lx, y) => { if (lx == null) return; const ex = ox + lx * s, ey = oy + y * s;
          const dx = Math.max(0, ex - r.right, r.left - ex), dy = Math.max(0, r.top - ey, ey - r.bottom); d = Math.min(d, Math.hypot(dx, dy)); });
        return d; };
      const boxes = { title: document.querySelector('.home-hero-t'), subtitle: document.querySelector('.home-hero-s'), progress: document.querySelector('.home-progress'), button: document.querySelector('.home-hero-btn') };
      const res = { objectPosition: cs.objectPosition, subtitleFontPx: parseFloat(getComputedStyle(boxes.subtitle).fontSize), progressText: document.querySelector('.home-progress')?.textContent };
      for (const [k, el] of Object.entries(boxes)) {
        if (!el) continue;
        const rg = document.createRange(); rg.selectNodeContents(el); const rects = [...rg.getClientRects()];
        const r = rects.length ? { left: Math.min(...rects.map((x) => x.left)), right: Math.max(...rects.map((x) => x.right)), top: Math.min(...rects.map((x) => x.top)), bottom: Math.max(...rects.map((x) => x.bottom)) } : el.getBoundingClientRect();
        const box = k === 'progress' || k === 'button' ? el.getBoundingClientRect() : r;
        res[k] = { textRight: Math.round((box.right - ir.left) * 10) / 10, rowGap: Math.round((subjectLeftAt(box.top, box.bottom) - box.right) * 10) / 10, nearestGap: Math.round(nearest(box) * 10) / 10 };
      }
      return res;
    }, HERO_MASK);
    out.push({ state, ...g });
    await ctx.close();
  }
  return out;
}
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const report = [];
let failed = 0;
for (const width of [375, 320]) {
  const page = await browser.newPage({ viewport: { width, height: 812 }, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const rect = (el) => el.getBoundingClientRect();
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const cards = [...document.querySelectorAll('.studio-card--home')].map((c) => {
      const cr = rect(c), art = rect(c.querySelector('.studio-card-art'));
      const fadeStop = parseFloat((getComputedStyle(c.querySelector('.studio-card-art')).maskImage || getComputedStyle(c.querySelector('.studio-card-art')).webkitMaskImage || '').match(/([\d.]+)%\)$/)?.[1] ?? '0');
      const opaqueLeft = art.left + (art.width * fadeStop) / 100;
      const texts = [c.querySelector('.studio-card-title'), ...c.querySelectorAll('.studio-card-sub > span')];
      const lineRects = texts.flatMap((t) => { const rg = document.createRange(); rg.selectNodeContents(t); return [...rg.getClientRects()]; });
      const textRight = Math.max(...lineRects.map((r) => r.right));
      const sub = c.querySelector('.studio-card-sub');
      const lh = parseFloat(getComputedStyle(sub).lineHeight);
      const descLines = [...sub.children].map((sp) => Math.round(sp.getBoundingClientRect().height / lh));
      return { title: c.querySelector('.studio-card-title').textContent, lines: [...sub.children].map((x) => x.textContent.replace(/\u200B/g, '')), descLines: descLines.reduce((x, y) => x + y, 0),
        cardW: Math.round(cr.width * 10) / 10, cardH: Math.round(cr.height * 10) / 10, top: Math.round(cr.top),
        artW: Math.round(art.width * 10) / 10, artH: Math.round(art.height * 10) / 10, artPct: Math.round((art.width / cr.width) * 1000) / 10,
        artFullHeight: art.height >= c.clientHeight - 0.5, artAnchored: Math.abs(art.right - (cr.left + c.clientLeft + c.clientWidth)) < 0.6 && Math.abs(art.bottom - (cr.top + c.clientTop + c.clientHeight)) < 0.6,
        textPct: Math.round(((textRight - cr.left) / cr.width) * 1000) / 10, opaqueArtPct: Math.round(((opaqueLeft - cr.left) / cr.width) * 1000) / 10,
        textOnOpaqueArt: lineRects.some((lr) => lr.right > opaqueLeft + 0.5 && hit(lr, art)),
        rects: lineRects.map((r) => [r.left - cr.left, r.top - cr.top, r.width, r.height]),
        colors: texts.flatMap((t) => { const rg = document.createRange(); rg.selectNodeContents(t); return [...rg.getClientRects()].map(() => getComputedStyle(t.closest('.studio-card-title') || sub).color); }) };
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
  // --- pixel pass: background behind text with text hidden; art contribution = (text hidden) − (text+art hidden)
  const cardEls = await page.$$('.studio-card--home');
  for (let i = 0; i < cardEls.length; i++) {
    const shot = async (css) => {
      const h = await page.addStyleTag({ content: css });
      const b = await cardEls[i].screenshot({ animations: 'disabled' });
      await h.evaluate((n) => n.remove());
      return 'data:image/png;base64,' + b.toString('base64');
    };
    if (process.env.CARD_SHOTS) { fs.mkdirSync(process.env.CARD_SHOTS, { recursive: true }); fs.writeFileSync(path.join(process.env.CARD_SHOTS, `card-${width}-${i}.png`), await cardEls[i].screenshot({ animations: 'disabled' })); }
    const noText = await shot('.studio-card--home .studio-card-title, .studio-card--home .studio-card-sub { color: transparent !important; }');
    const noTextNoArt = await shot('.studio-card--home .studio-card-title, .studio-card--home .studio-card-sub { color: transparent !important; } .studio-card--home .studio-card-art { visibility: hidden !important; }');
    const c = r.cards[i];
    Object.assign(c, await page.evaluate(async ({ noText, noTextNoArt, rects, colors }) => {
      const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src; });
      const [a, b] = await Promise.all([load(noText), load(noTextNoArt)]);
      const px = (im) => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height); };
      const A = px(a), B = px(b), s = A.width / document.querySelector('.studio-card--home').getBoundingClientRect().width;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const L = (r, g, b2) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b2);
      let minRatio = 99, maxArtDelta = 0; const perLine = [];
      rects.forEach(([x, y, w, h], k) => { let lm = 99, ld = 0, at = null;
        const [tr, tg, tb] = colors[k].match(/\d+/g).map(Number); const Lt = L(tr, tg, tb);
        for (let yy = Math.floor(y * s); yy < Math.ceil((y + h) * s); yy++) for (let xx = Math.floor(x * s); xx < Math.ceil((x + w) * s); xx++) {
          if (xx < 0 || yy < 0 || xx >= A.width || yy >= A.height) continue;
          const o = (yy * A.width + xx) * 4; const Lb = L(A.data[o], A.data[o + 1], A.data[o + 2]);
          const ratio = (Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05); if (ratio < lm) lm = ratio;
          const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
          if (d > ld) { ld = d; at = [xx / s, yy / s]; }
        }
        minRatio = Math.min(minRatio, lm); maxArtDelta = Math.max(maxArtDelta, ld);
        perLine.push({ minContrast: Math.round(lm * 100) / 100, artDelta: ld, at });
      });
      return { minContrast: Math.round(minRatio * 100) / 100, maxArtDeltaBehindText: maxArtDelta, perLine };
    }, { noText, noTextNoArt, rects: c.rects, colors: c.colors }));
    delete c.rects; delete c.colors;
  }
  r.heroGaps = await heroGaps(browser, width);
  r.heroSubtitleMinGap = Math.min(...r.heroGaps.map((h) => h.subtitle.nearestGap));
  const rows = {}; r.cards.forEach((c) => (rows[c.top] ||= []).push(c.cardH));
  r.sameRowEqual = Object.values(rows).every((hs) => Math.max(...hs) - Math.min(...hs) < 0.5);
  r.minTextContrast = Math.min(...r.cards.map((c) => c.minContrast));
  const artTarget = width < 360 ? [38, 50] : [46, 54];
  const ok = (width >= 360 || r.heroSubtitleMinGap >= 12) && r.sameRowEqual && r.cards.every((c) => !c.textOnOpaqueArt && c.artFullHeight && c.artAnchored && c.artPct >= artTarget[0] && c.artPct <= artTarget[1]
      && c.descLines <= (width < 360 ? 3 : 2) && c.minContrast >= 4.5 && c.maxArtDeltaBehindText <= 90)
    && (width < 360 || JSON.stringify(r.cards.find((c) => c.title === '联想').lines) === JSON.stringify(['把新信息与熟悉的', '事物联系起来'])) && r.methods.every((m) => m.oneLine && m.noCollision && m.inStrip && m.notClipped && m.visible && m.fontSize >= 10) && r.heroTextRight <= 16 + 190 + 0.5 && !r.stripScrolls && !r.pageHScroll;
  if (!ok) failed++;
  report.push({ width, ok, ...r });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${width}px`, JSON.stringify({ heroTextRight: r.heroTextRight, heroHeight: r.heroHeight, heroSubtitleMinGap: r.heroSubtitleMinGap, heroGaps: r.heroGaps, cards: r.cards, sameRowEqual: r.sameRowEqual, minTextContrast: r.minTextContrast, methods: r.methods.map((m) => [m.name, m.desc, m.oneLine && m.noCollision && m.inStrip && m.notClipped]), clipped: r.clipped }));
  await page.close();
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
await browser.close();
server.close();
process.exit(failed ? 1 : 0);

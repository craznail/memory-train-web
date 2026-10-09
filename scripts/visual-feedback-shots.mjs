#!/usr/bin/env node
/**
 * Visual v2 (#5): capture QuestionCard 答对 / 答错 feedback on /practice.
 * Audio is short-circuited in the browser (play() → 'ended') so no real playback is needed.
 * Usage: node scripts/visual-feedback-shots.mjs <outDir> [label]   (needs `npm run build`)
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const OUT = path.resolve(process.argv[2] || '/tmp/visual-feedback');
const LABEL = process.argv[3] || 'after';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(DIST, p === '/' ? 'index.html' : p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const APP = `http://127.0.0.1:${server.address().port}`;

// prompt → answer from the bundled papers (so we can answer one question correctly)
const ANSWERS = JSON.parse(execSync(
  `npx --yes tsx -e "import('./src/data/papers.ts').then(m=>console.log(JSON.stringify(Object.fromEntries(m.PAPERS.flatMap(p=>p.questions.map(q=>[q.prompt,q.answer]))))))"`,
  { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' },
).trim().split('\n').pop());

const browser = await chromium.launch();
const out = {};
for (const reduced of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { setTimeout(() => this.dispatchEvent(new Event('ended')), 50); return Promise.resolve(); };
  });
  await page.goto(`${APP}/#/practice`, { waitUntil: 'networkidle' });
  const settle = async () => {
    for (let i = 0; i < 30; i++) {
      if (await page.locator('.feedback').count()) return true;
      const num = page.locator('input[type="number"]:not([disabled])');
      if (await num.count()) {
        await num.fill('0');
        await page.locator('.card button:not([disabled])').last().click().catch(() => {});
        await page.waitForTimeout(200);
        continue;
      }
      if (await page.locator('input.input-field:not([disabled])').count()) return false;
      if (await page.locator('.option-btn:not([disabled])').count()) return false;
      const btn = page.locator('button:not([disabled])').filter({ hasText: /播放|开始|继续|跳过|下一步|提交|去作答|我记好了/ }).first();
      if (await btn.count()) await btn.click().catch(() => {});
      await page.waitForTimeout(250);
    }
    return false;
  };
  const shots = [];
  for (let q = 0; q < 6 && shots.length < 2; q++) {
    await settle();
    const opt = page.locator('.option-btn:not([disabled])');
    const wantWrong = shots.length === 0;
    const prompt = (await page.locator('.card.stack > div').nth(1).innerText().catch(() => '')).trim();
    const answer = ANSWERS[prompt];
    if (await opt.count()) {
      const texts = await opt.allInnerTexts();
      let idx = texts.findIndex((t) => t.trim() === answer);
      if (wantWrong) idx = texts.findIndex((t) => t.trim() !== answer);
      await opt.nth(Math.max(0, idx)).click();
    } else if (await page.locator('input.input-field:not([disabled])').count()) {
      await page.locator('input.input-field:not([disabled])').fill(wantWrong ? '不知道' : String(answer ?? 'x'));
    } else break;
    await page.getByRole('button', { name: /下一题|完成本轮/ }).click();
    await page.waitForTimeout(80);
    if (await page.locator('.feedback').count()) {
      const kind = (await page.locator('.feedback--ok').count()) ? 'correct' : 'wrong';
      if (!reduced) {
        await page.waitForTimeout(400);
        const f = `${LABEL}-feedback-${kind}-375.png`;
        if (!shots.includes(kind)) { await page.screenshot({ path: path.join(OUT, f), fullPage: true }); await page.locator('.feedback').screenshot({ path: path.join(OUT, `${LABEL}-feedback-${kind}-bar.png`) }); shots.push(kind); console.log(f); }
      } else {
        out.reducedFeedback = await page.locator('.feedback').evaluate((n) => { const s = getComputedStyle(n); return { anim: s.animationName, dur: s.animationDuration }; });
        break;
      }
      await page.getByRole('button', { name: /下一题|完成本轮/ }).click();
    }
  }
  if (!reduced) out.normalFeedback = shots;
  await ctx.close();
}
console.log(JSON.stringify(out));
fs.writeFileSync(path.join(OUT, `${LABEL}-feedback.json`), JSON.stringify(out, null, 2));
await browser.close();
server.close();

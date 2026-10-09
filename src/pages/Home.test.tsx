import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

(globalThis as unknown as { React: typeof React }).React = React;

function installStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  const storage = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => { writes.push(k); data.set(k, v); },
    removeItem: (k: string) => { writes.push(k); data.delete(k); },
    clear: () => { writes.push('*'); data.clear(); },
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  return { data, writes };
}

async function renderHome() {
  const { Home } = await import('./Home');
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Home)));
}

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();
const plan = (done: boolean[], completed = false) =>
  JSON.stringify({ date: today, currentIndex: 0, completed, rounds: done.map((d, i) => ({ paperId: `p${i}`, withInterference: i === 0, done: d })) });

describe('Home page (visual v2)', () => {
  it('opening the home page does NOT generate today\'s plan (no storage writes)', async () => {
    const { data, writes } = installStorage();
    const html = await renderHome();
    assert.deepEqual(writes, [], 'home must not write storage');
    assert.equal(data.size, 0, 'no memory-train-daily-* plan created');
    assert.match(html, /<b>0<\/b>\/3/);
    assert.match(html, /开始/);
  });

  it('partial plan → 2/3 · 继续, plan left untouched', async () => {
    const key = `memory-train-daily-${today}`;
    const raw = plan([true, true, false]);
    const { data, writes } = installStorage({ [key]: raw });
    const html = await renderHome();
    assert.deepEqual(writes, []);
    assert.equal(data.get(key), raw);
    assert.match(html, /<b>2<\/b>\/3/);
    assert.match(html, /继续/);
    assert.doesNotMatch(html, /今日已完成/);
  });

  it('completed plan → 3/3 · 今日已完成 · 再练一组', async () => {
    installStorage({ [`memory-train-daily-${today}`]: plan([true, true, true], true) });
    const html = await renderHome();
    assert.match(html, /<b>3<\/b>\/3/);
    assert.match(html, /今日已完成/);
    assert.match(html, /再练一组/);
  });

  it('uses the reference copy (项目总管 review) and none of the old captions', async () => {
    installStorage();
    const html = await renderHome();
    for (const t of ['每一次专注的聆听，都是更强大记忆力的开始。', '测出你的听觉记忆水平', '探索 6 种记忆方法，构建你的记忆力体系', '多样化练习，提升你的听觉记忆能力', '看看你的进步', '个性化你的训练体验', '听一段语音，'])
      assert.ok(html.includes(t), t);
    for (const t of ['测一测 · 学方法 · 练听力', '正式评分', '不计正式分', '按优先级逐个学', '10 分钟']) assert.ok(!html.includes(t), t);
  });

  it('shows all 6 methods and 练听力 first in the bottom row', async () => {
    installStorage();
    const html = await renderHome();
    for (const n of ['分组', '联想', '故事', '编码', '成像', '记忆宫殿']) assert.ok(html.includes(n), n);
    const bottom = html.slice(html.indexOf('aria-label="更多"'));
    assert.ok(bottom.indexOf('练听力') < bottom.indexOf('能力报告') && bottom.indexOf('能力报告') < bottom.indexOf('设置'));
  });

  it('练习台 cards use the reference two-line descriptions (one span per line) and keep the illustration', async () => {
    installStorage();
    const html = (await renderHome()).replace(/\u200B/g, '');
    const expected: Record<string, [string, string]> = {
      成像: ['在脑中构建画面', '让信息更深刻'],
      编码: ['把数字、文字', '变成有意义的代码'],
      联想: ['把新信息与熟悉的', '事物联系起来'],
      宫殿: ['在熟悉的空间中', '建立记忆线索'],
    };
    const cards = html.split('studio-card studio-card--home').slice(1);
    assert.equal(cards.length, 4);
    for (const card of cards) {
      const title = card.match(/studio-card-title serif">([^<]+)</)![1];
      const lines = [...card.matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1]);
      assert.deepEqual(lines, expected[title], title);
      assert.ok(card.includes('studio-card-art-img'), `${title} illustration`);
    }
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

(globalThis as unknown as { React: typeof React }).React = React;

function install(value: unknown) {
  const data = new Map<string, string>(value ? [['memory-train-score-history', JSON.stringify(value)]] : []);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, writable: true,
    value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) },
  });
}
const stat = (category: string, correct: number) => ({ category, correct, total: 1 });
const score = (overall: number, date: string, stats = [stat('人物', 1), stat('时间', 0), stat('地点', 1), stat('任务', 1), stat('数字', 0)]) => ({
  overall, auditory: overall, antiInterference: 100, weakPoints: [], date, paperId: 'A', categoryStats: stats, interferencePassed: true,
});
async function render() {
  const { ScoreReport } = await import('./ScoreReport');
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ScoreReport)));
}

describe('ScoreReport (visual v2)', () => {
  it('header 能力报告, banner 本次成绩, real overall, 5 bars, history, 去练习', async () => {
    const latest = score(72, '2026-10-12T02:00:00Z');
    install({ latest, history: [latest, score(60, '2026-10-10T02:00:00Z'), score(48, '2026-10-08T02:00:00Z')] });
    const html = await render();
    assert.equal(html.match(/能力报告/g)?.length, 1, '能力报告 only in header');
    assert.match(html, /本次成绩/);
    assert.match(html, /<strong>72<\/strong>/);
    assert.equal(html.match(/data-testid="cat-bar"/g)?.length, 5);
    assert.match(html, /历次成绩/);
    assert.match(html, /第1次.*第2次.*第3次/s);
    assert.match(html, /去练习/);
  });
  it('weak cards = the two lowest real categories', async () => {
    const latest = score(80, '2026-10-12T02:00:00Z', [stat('人物', 1), stat('时间', 1), stat('地点', 0), stat('任务', 1), stat('数字', 1)]);
    install({ latest, history: [latest] });
    const html = await render();
    const weak = [...html.matchAll(/data-testid="weak-card".*?weak-name">(.+?)</g)].map((m) => m[1]);
    assert.deepEqual(weak, ['地点']);
  });
  it('category icons use only the warm palette (no purple/blue/pink)', async () => {
    const css = (await import('node:fs')).readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
    const block = css.slice(css.indexOf('/* 能力报告 v2 */'));
    assert.doesNotMatch(block, /purple|blue|pink|#(?:8b5cf6|a78bfa|3b82f6|60a5fa|ec4899|f472b6)/i);
  });
});

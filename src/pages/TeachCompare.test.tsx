import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

(globalThis as unknown as { React: typeof React }).React = React;
const sum = (correct: number) => ({ correct, wrong: 5 - correct, missed: 0, total: 5, records: [] });

async function render(b: number, a: number) {
  const { CompareColumns } = await import('./TeachSession');
  return renderToStaticMarkup(createElement(CompareColumns, { blind: sum(b), after: sum(a) }));
}

describe('Teach step 4 对比', () => {
  it('improved: arrow and +N', async () => {
    const html = await render(2, 4);
    assert.match(html, /data-case="improved"/);
    assert.match(html, /\+2/);
    assert.match(html, /<path d="M2 11h22/);
  });
  for (const [label, b, a] of [['equal', 3, 3], ['lower', 4, 2]] as const) {
    it(`${label}: calm elephant + encouragement, no arrow / +0 / negative`, async () => {
      const html = await render(b, a);
      assert.match(html, /data-case="flat"/);
      assert.match(html, /方法要多练几次才顺手/);
      assert.match(html, /hero-elephant-landscape@1x\.webp/);
      assert.doesNotMatch(html, /M2 11h22/);
      assert.doesNotMatch(html, /\+0|>-\d|−\d/);
      assert.match(html, new RegExp(`<strong>${b}</strong>.*<strong>${a}</strong>`));
    });
  }
});

describe('Report 历次成绩 empty state', () => {
  const score = (overall: number) => ({ overall, auditory: overall, antiInterference: 100, weakPoints: [], date: '2026-10-12T02:00:00Z', paperId: 'A' });
  it('0 or 1 records → empty state, no chart', async () => {
    const { HistoryLine } = await import('../components/v2/ReportParts');
    for (const h of [[], [score(70)]]) {
      const html = renderToStaticMarkup(createElement(HistoryLine, { history: h }));
      assert.match(html, /data-testid="history-empty"/);
      assert.doesNotMatch(html, /history-line/);
    }
    const two = renderToStaticMarkup(createElement(HistoryLine, { history: [score(70), score(60)] }));
    assert.match(two, /data-testid="history-line"/);
    assert.equal(two.match(/<circle/g)?.length, 2, 'only real points are drawn');
  });
});

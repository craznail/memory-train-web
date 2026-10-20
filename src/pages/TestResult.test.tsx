import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PAPERS } from '../data/papers';
import { equationOf } from '../components/InterferenceCard';

(globalThis as unknown as { React: typeof React }).React = React;

describe('TestResult (visual v2)', () => {
  it('banner N/5 + 抗干扰, 3 row styles, weak chips = two lowest, buttons', async () => {
    const { TestResult } = await import('./TestResult');
    const { gradeAnswers, computeTestScore } = await import('../lib/scoring');
    const paper = PAPERS[0];
    const [q0, q1, q2] = paper.questions;
    const wrong = q1.choices?.find((c) => c !== q1.answer) ?? 'x';
    const answers: Record<string, string> = { [q0.id]: q0.answer, [q1.id]: wrong, [q2.id]: q2.answer };
    const records = gradeAnswers(paper, answers);
    const score = computeTestScore(paper, records, false);
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: [{ pathname: '/test/result', state: { score, records, paperId: paper.id } }] }, createElement(TestResult)),
    );
    assert.match(html, /测试完成/);
    assert.match(html, /<strong>2<\/strong><span>\/ 5<\/span>/);
    assert.match(html, /抗干扰<strong>40<\/strong>分/);
    assert.equal(html.match(/data-testid="result-row"/g)?.length, 5);
    assert.equal(html.match(/data-result="correct"/g)?.length, 2);
    assert.equal(html.match(/data-result="wrong"/g)?.length, 1);
    assert.equal(html.match(/data-result="missed"/g)?.length, 2);
    assert.match(html, new RegExp(`你的答案：${wrong}<small>（应为 ${q1.answer}）`));
    assert.match(html, />未作答</);
    assert.equal(html.match(/data-testid="weak-chip"/g)?.length, 2);
    for (const b of ['再测一次', '查看历史报告', '返回首页']) assert.match(html, new RegExp(b));
  });
  it('interference equation strips the 请心算 prefix', () => {
    assert.equal(equationOf('请心算：4 + 7 = ?'), '4 + 7 = ?');
    assert.equal(equationOf('9 - 3 = ?'), '9 - 3 = ?');
  });
});

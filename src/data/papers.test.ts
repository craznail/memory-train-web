import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAPERS, TEST_PAPERS, pickPaper, pickPaperByIndex } from './papers';
import { METHODS } from './methods';

const CATS = ['人物', '时间', '地点', '任务', '数字'];
const METHOD_IDS = new Set(METHODS.map((m) => m.id));

test('bank has 12 papers: 3 easy, 6 medium, 3 hard', () => {
  assert.equal(PAPERS.length, 12);
  const count = (l: string) => PAPERS.filter((p) => p.level === l).length;
  assert.deepEqual([count('easy'), count('medium'), count('hard')], [3, 6, 3]);
  assert.equal(new Set(PAPERS.map((p) => p.id)).size, PAPERS.length);
});

for (const p of PAPERS) {
  test(`paper ${p.id} is well-formed`, () => {
    assert.ok(['easy', 'medium', 'hard'].includes(p.level));
    assert.ok(p.methods.length > 0 && p.methods.every((m) => METHOD_IDS.has(m)));
    assert.equal(p.questions.length, 5);
    assert.deepEqual([...p.questions.map((q) => q.category)].sort(), [...CATS].sort());
    for (const q of p.questions) {
      assert.equal(q.choices?.length, 4, q.id);
      assert.equal(new Set(q.choices).size, 4, q.id);
      assert.ok(q.choices!.includes(q.answer), `${q.id} answer in choices`);
    }
    assert.ok(p.withInterference && p.interference, 'interference kept');
    assert.ok(p.chunks.length >= 5);
    assert.equal(new Set(p.questions.map((q) => q.id)).size, 5);
  });
}

test('formal test uses only medium papers', () => {
  assert.ok(TEST_PAPERS.length >= 3);
  assert.ok(TEST_PAPERS.every((p) => p.level === 'medium'));
  for (let i = 0; i < 20; i++) assert.equal(pickPaperByIndex(i).level, 'medium');
});

test('practice can pick by level', () => {
  for (const l of ['easy', 'hard'] as const) {
    for (let i = 0; i < 10; i++) assert.equal(pickPaper(undefined, l).level, l);
  }
});

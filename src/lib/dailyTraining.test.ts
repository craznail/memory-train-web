import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { localDateKey, peekDailyPlan, peekDailyProgress } from './dailyTraining';
import { greetingFor } from './greeting';

/** Storage double that records every call; only getItem is allowed for peek. */
function spyStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const calls: string[] = [];
  const storage = {
    getItem(k: string) { calls.push(`get:${k}`); return data.has(k) ? data.get(k)! : null; },
    setItem(k: string, v: string) { calls.push(`set:${k}`); data.set(k, v); },
    removeItem(k: string) { calls.push(`remove:${k}`); data.delete(k); },
    clear() { calls.push('clear'); data.clear(); },
    key(i: number) { return [...data.keys()][i] ?? null; },
    get length() { return data.size; },
  };
  return { storage, data, calls };
}

const DATE = '2026-10-09';
const NOW = new Date(2026, 9, 9, 15, 0);
const KEY = `memory-train-daily-${DATE}`;
const plan = (done: boolean[], completed = false, date = DATE) =>
  JSON.stringify({
    date,
    currentIndex: done.filter(Boolean).length,
    completed,
    rounds: done.map((d, i) => ({ paperId: `p${i}`, withInterference: i === 0, done: d })),
  });

describe('peekDailyProgress (read-only, home page)', () => {
  it('no plan today → 0/3 and creates nothing', () => {
    const { storage, data, calls } = spyStorage();
    const p = peekDailyProgress(NOW, storage);
    assert.deepEqual(p, { done: 0, total: 3, completed: false, hasPlan: false });
    assert.equal(data.size, 0, 'storage must stay empty (no plan created)');
    assert.deepEqual(calls, [`get:${KEY}`], 'only a single read');
  });

  it('existing plan → counts done rounds without writing', () => {
    const { storage, data, calls } = spyStorage({ [KEY]: plan([true, true, false]) });
    const before = data.get(KEY);
    assert.deepEqual(peekDailyProgress(NOW, storage), { done: 2, total: 3, completed: false, hasPlan: true });
    assert.equal(data.get(KEY), before, 'plan untouched');
    assert.ok(calls.every((c) => c.startsWith('get:')), `unexpected writes: ${calls.join(',')}`);
  });

  it('completed plan → 3/3 completed', () => {
    const { storage } = spyStorage({ [KEY]: plan([true, true, true], true) });
    assert.deepEqual(peekDailyProgress(NOW, storage), { done: 3, total: 3, completed: true, hasPlan: true });
  });

  it("yesterday's plan or malformed data → 0/3, nothing repaired or written", () => {
    for (const raw of [plan([true, false, false], false, '2026-10-08'), '{not json', JSON.stringify({ date: DATE, rounds: [] })]) {
      const { storage, data, calls } = spyStorage({ [KEY]: raw });
      assert.equal(peekDailyProgress(NOW, storage).done, 0);
      assert.equal(data.get(KEY), raw);
      assert.ok(calls.every((c) => c.startsWith('get:')));
    }
  });

  it('no storage available (SSR/tests) → 0/3', () => {
    assert.equal(peekDailyProgress(NOW, undefined).hasPlan, false);
  });

  it('default date key is the local date', () => {
    assert.equal(localDateKey(new Date(2026, 9, 9, 23, 59)), DATE);
  });
});

describe('peekDailyPlan (read-only)', () => {
  it('no key → null, storage unchanged', () => {
    const { storage, data, calls } = spyStorage({ other: 'x' });
    assert.equal(peekDailyPlan(NOW, storage), null);
    assert.deepEqual([...data.entries()], [['other', 'x']]);
    assert.ok(calls.every((c) => c.startsWith('get:')));
  });
  it('bad JSON → null, storage unchanged', () => {
    const { storage, data, calls } = spyStorage({ [KEY]: '{oops' });
    assert.equal(peekDailyPlan(NOW, storage), null);
    assert.equal(data.get(KEY), '{oops');
    assert.ok(calls.every((c) => c.startsWith('get:')));
  });
  it("today's plan → returned as-is, storage unchanged", () => {
    const raw = plan([true, false, false]);
    const { storage, data } = spyStorage({ [KEY]: raw });
    assert.equal(peekDailyPlan(NOW, storage)?.rounds.length, 3);
    assert.equal(data.get(KEY), raw);
    assert.equal(data.size, 1);
  });
});

describe('greetingFor boundaries', () => {
  const t = (h: number, m: number) => greetingFor(new Date(2026, 9, 9, h, m));
  it('[05,11) 早上好 · [11,13) 中午好 · [13,18) 下午好 · else 晚上好', () => {
    assert.equal(t(4, 59), '晚上好');
    assert.equal(t(5, 0), '早上好');
    assert.equal(t(10, 59), '早上好');
    assert.equal(t(11, 0), '中午好');
    assert.equal(t(12, 59), '中午好');
    assert.equal(t(13, 0), '下午好');
    assert.equal(t(17, 59), '下午好');
    assert.equal(t(18, 0), '晚上好');
    assert.equal(t(0, 0), '晚上好');
  });
});

describe('greetingFor', () => {
  const at = (h: number) => greetingFor(new Date(2026, 9, 9, h, 30));
  it('changes by time of day', () => {
    assert.equal(at(4), '晚上好');
    assert.equal(at(5), '早上好');
    assert.equal(at(10), '早上好');
    assert.equal(at(11), '中午好');
    assert.equal(at(12), '中午好');
    assert.equal(at(13), '下午好');
    assert.equal(at(17), '下午好');
    assert.equal(at(18), '晚上好');
    assert.equal(at(23), '晚上好');
  });
});

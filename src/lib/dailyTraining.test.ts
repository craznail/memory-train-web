import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { localDateKey, peekDailyProgress } from './dailyTraining';
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
    const p = peekDailyProgress(DATE, storage);
    assert.deepEqual(p, { done: 0, total: 3, completed: false, hasPlan: false });
    assert.equal(data.size, 0, 'storage must stay empty (no plan created)');
    assert.deepEqual(calls, [`get:${KEY}`], 'only a single read');
  });

  it('existing plan → counts done rounds without writing', () => {
    const { storage, data, calls } = spyStorage({ [KEY]: plan([true, true, false]) });
    const before = data.get(KEY);
    assert.deepEqual(peekDailyProgress(DATE, storage), { done: 2, total: 3, completed: false, hasPlan: true });
    assert.equal(data.get(KEY), before, 'plan untouched');
    assert.ok(calls.every((c) => c.startsWith('get:')), `unexpected writes: ${calls.join(',')}`);
  });

  it('completed plan → 3/3 completed', () => {
    const { storage } = spyStorage({ [KEY]: plan([true, true, true], true) });
    assert.deepEqual(peekDailyProgress(DATE, storage), { done: 3, total: 3, completed: true, hasPlan: true });
  });

  it("yesterday's plan or malformed data → 0/3, nothing repaired or written", () => {
    for (const raw of [plan([true, false, false], false, '2026-10-08'), '{not json', JSON.stringify({ date: DATE, rounds: [] })]) {
      const { storage, data, calls } = spyStorage({ [KEY]: raw });
      assert.equal(peekDailyProgress(DATE, storage).done, 0);
      assert.equal(data.get(KEY), raw);
      assert.ok(calls.every((c) => c.startsWith('get:')));
    }
  });

  it('no storage available (SSR/tests) → 0/3', () => {
    assert.equal(peekDailyProgress(DATE, undefined).hasPlan, false);
  });

  it('default date key is the local date', () => {
    assert.equal(localDateKey(new Date(2026, 9, 9, 23, 59)), DATE);
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

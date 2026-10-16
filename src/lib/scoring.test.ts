import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { weakestTwo } from './scoring';
import type { CategoryStat } from '../types';

const s = (category: CategoryStat['category'], correct: number, total = 1): CategoryStat => ({ category, correct, total });

describe('weakestTwo (report 弱项)', () => {
  it('picks the two lowest-accuracy categories', () => {
    const r = weakestTwo([s('人物', 9, 10), s('时间', 6, 10), s('地点', 8, 10), s('任务', 7, 10), s('数字', 8, 10)]);
    assert.deepEqual(r, [{ category: '时间', pct: 60 }, { category: '任务', pct: 70 }]);
  });
  it('does not pick a high-accuracy category just because it is listed last', () => {
    const r = weakestTwo([s('人物', 88, 100), s('时间', 60, 100), s('地点', 78, 100), s('任务', 70, 100), s('数字', 85, 100)]);
    assert.deepEqual(r.map((x) => x.category), ['时间', '任务']);
  });
  it('ties keep category order; perfect and unasked categories are excluded', () => {
    assert.deepEqual(weakestTwo([s('人物', 0), s('时间', 0), s('地点', 0), s('任务', 1), s('数字', 0, 0)]).map((x) => x.category), ['人物', '时间']);
    assert.deepEqual(weakestTwo([s('人物', 1), s('时间', 0), s('地点', 1)]).map((x) => x.category), ['时间']);
    assert.deepEqual(weakestTwo([s('人物', 1), s('时间', 1)]), []);
  });
});

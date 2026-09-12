export interface CodeEntry {
  digit: string;
  word: string;
  emoji: string;
  hint: string;
}

/** Starter Major-style-ish 0-9 table (product-expandable to 00-99) */
export const CODE_TABLE_0_9: CodeEntry[] = [
  { digit: '0', word: '皮球', emoji: '⚽', hint: '圆圆的零' },
  { digit: '1', word: '铅笔', emoji: '✏️', hint: '细长像 1' },
  { digit: '2', word: '鸭子', emoji: '🦆', hint: '侧看像 2' },
  { digit: '3', word: '耳朵', emoji: '👂', hint: '两弯像 3' },
  { digit: '4', word: '帆船', emoji: '⛵', hint: '三角帆像 4' },
  { digit: '5', word: '钩子', emoji: '🪝', hint: '弯钩像 5' },
  { digit: '6', word: '勺子', emoji: '🥄', hint: '勺把像 6' },
  { digit: '7', word: '拐杖', emoji: '🦯', hint: '拐角像 7' },
  { digit: '8', word: '眼镜', emoji: '👓', hint: '两圈像 8' },
  { digit: '9', word: '气球', emoji: '🎈', hint: '线垂像 9' },
];

export type DrillMode = 'digitToImage' | 'imageToDigit';

export function randomDrill(mode: DrillMode, n = 6) {
  const shuffled = [...CODE_TABLE_0_9].sort(() => Math.random() - 0.5).slice(0, n);
  return shuffled.map((e) => ({
    prompt: mode === 'digitToImage' ? e.digit : e.word,
    answer: mode === 'digitToImage' ? e.digit : e.digit,
    entry: e,
  }));
}

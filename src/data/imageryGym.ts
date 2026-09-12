export interface ImageryRound {
  id: string;
  left: string;
  right: string;
  /** Exaggerated option prompts */
  options: string[];
  /** Index of best exaggerated option (for tip); free text also scored by rules */
  bestOption: number;
}

export const IMAGERY_ROUNDS: ImageryRound[] = [
  {
    id: 'r1',
    left: '图书馆',
    right: '闹钟',
    options: [
      '图书馆门口立着一座会走路的巨大闹钟',
      '图书馆和闹钟都是学习用品',
      '早上在图书馆看了看时间',
    ],
    bestOption: 0,
  },
  {
    id: 'r2',
    left: '合同',
    right: '鸭子',
    options: [
      '一只鸭子叼着两份合同游过喷泉',
      '合同里提到了鸭子',
      '鸭子和合同都是名词',
    ],
    bestOption: 0,
  },
  {
    id: 'r3',
    left: '高铁',
    right: '草莓',
    options: [
      '高铁车头变成草莓味，沿途洒下一串粉红车厢',
      '高铁上吃了草莓',
      '两者都很快',
    ],
    bestOption: 0,
  },
  {
    id: 'r4',
    left: '医生',
    right: '月亮',
    options: [
      '医生站在月亮上给星星听诊，听诊器垂到地球',
      '医生晚上加班看到月亮',
      '医生和月亮都让人安心',
    ],
    bestOption: 0,
  },
  {
    id: 'r5',
    left: '钥匙',
    right: '火山',
    options: [
      '一把滚烫的钥匙插进火山口，岩浆变成锁孔',
      '钥匙掉进了火山附近',
      '钥匙和火山都很危险',
    ],
    bestOption: 0,
  },
];

export interface ImageryScore {
  concrete: boolean;
  exaggerated: boolean;
  action: boolean;
  pass: boolean;
}

/** Rule score: prefer concrete nouns + exaggeration cues + verbs */
export function scoreImageryText(text: string): ImageryScore {
  const t = text.trim();
  const concrete = t.length >= 8;
  const exaggerated = /巨大|爆炸|飞|游|变成|站在|插进|洒下|滚烫|垂到|会走路/.test(t);
  const action = /着|成|到|过|在|把|让|变|插|游|飞|站|洒/.test(t);
  const pass = concrete && (exaggerated || action) && t.length >= 10;
  return { concrete, exaggerated, action, pass };
}

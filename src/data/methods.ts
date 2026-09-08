export type MethodStatus = 'ready' | 'coming';

export interface MethodDef {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  status: MethodStatus;
  /** Short explain paragraphs for teach step 2 */
  explain: string[];
  /** Round-2 listen cues only — no full answers */
  replayCues: string[];
  /** Optional fuller example shown only on explain/compare */
  example?: string;
}

/** Priority order: complete one by one */
export const METHODS: MethodDef[] = [
  {
    id: 'chunking',
    title: '信息分组',
    subtitle: 'Chunking · 已上线',
    emoji: '🧩',
    status: 'ready',
    explain: [
      '把一长串信息按固定类别拆开，例如：人物、时间、地点、任务、数字。',
      '大脑更擅长记住「几组有标签的信息」，而不是一整段连续语音。听的时候主动往这些格子里填，回忆时也按格子提取。',
    ],
    replayCues: ['人物', '时间', '地点', '任务', '数字'],
    example: '听的时候默念：谁？几点？在哪？做什么？几个？',
  },
  {
    id: 'association',
    title: '联想记忆',
    subtitle: '把陌生信息和熟悉画面强行挂钩',
    emoji: '🔗',
    status: 'ready',
    explain: [
      '联想记忆：把要记的人和事，跟已经熟悉、夸张、荒诞的画面连在一起。',
      '画面越夸张越好记。例如「图书馆门口」可以想成门口竖着一本巨大的书当门。',
    ],
    replayCues: ['人物画面', '地点画面', '动作挂钩', '夸张细节'],
    example: '小李和小王 → 两人头顶顶着图书馆；九点 → 钟表砸进书页。',
  },
  {
    id: 'story',
    title: '故事串联',
    subtitle: '把信息串成一条小故事',
    emoji: '📖',
    status: 'ready',
    explain: [
      '故事串联：把要记的人、时间、地点、任务，按顺序编成一个有情节的小故事。',
      '故事有开头、发展和结尾，顺序会跟着情节走，比单独硬背更稳。',
    ],
    replayCues: ['开头人物', '中间地点', '关键动作', '结尾结果'],
    example: '先出现谁 → 去了哪 → 做了什么 → 最后怎样。把这四步讲成一句话故事。',
  },
  {
    id: 'encoding',
    title: '信息编码',
    subtitle: '把难记信息换成好记的代码',
    emoji: '🔢',
    status: 'ready',
    explain: [
      '信息编码：把难记的数字、名单、条件，先换成你熟悉的「代码」或关键词，再记代码。',
      '例如数字像形状：1→铅笔、2→鸭子；人名用特征词代替。回忆时先解码再还原。',
    ],
    replayCues: ['数字代码', '人名特征', '条件口诀', '顺序标记'],
    example: '两份合同 → 「二」用鸭子；七点半 → 「早」用闹钟符号。先记符号再还原。',
  },
  {
    id: 'imagery',
    title: '图像化',
    subtitle: '把抽象信息变成具体画面',
    emoji: '🖼️',
    status: 'ready',
    explain: [
      '图像化：把抽象、干巴的信息，先在脑子里变成具体、鲜明的画面再记。',
      '颜色、大小、动静越清楚越好。例如「优先处理」可以想成红灯闪烁的任务单顶在最前面。',
    ],
    replayCues: ['人物外形', '场景色调', '关键道具', '动态动作'],
    example: '听的时候问自己：我看到了谁？在什么颜色的地方？手里拿着什么？在做什么动作？',
  },
  {
    id: 'palace',
    title: '记忆宫殿',
    subtitle: '即将开放',
    emoji: '🏛️',
    status: 'coming',
    explain: [],
    replayCues: [],
  },
];

export function getMethod(id: string): MethodDef | undefined {
  return METHODS.find((m) => m.id === id);
}

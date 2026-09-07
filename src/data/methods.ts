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
    subtitle: '即将开放',
    emoji: '📖',
    status: 'coming',
    explain: [],
    replayCues: [],
  },
  {
    id: 'encoding',
    title: '信息编码',
    subtitle: '即将开放',
    emoji: '🔢',
    status: 'coming',
    explain: [],
    replayCues: [],
  },
  {
    id: 'imagery',
    title: '图像化',
    subtitle: '即将开放',
    emoji: '🖼️',
    status: 'coming',
    explain: [],
    replayCues: [],
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

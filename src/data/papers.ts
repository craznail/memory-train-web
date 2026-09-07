import type { Paper } from '../types';

/** 2–3 parallel fixed papers: same structure/difficulty, different content */
export const PAPERS: Paper[] = [
  {
    id: 'paper-a',
    title: '试卷 A · 周末安排',
    passage:
      '周六上午九点，小李约了同事小王，在市图书馆门口见面。他们一起讨论下周的项目方案，然后中午去附近的面馆吃午餐，下午再去健身房锻炼一小时。',
    chunks: [
      { label: '时间', text: '周六上午九点' },
      { label: '人物', text: '小李、小王' },
      { label: '地点', text: '市图书馆门口' },
      { label: '任务', text: '讨论项目方案 → 吃午餐 → 健身房锻炼' },
      { label: '数字', text: '锻炼一小时' },
    ],
    withInterference: true,
    interference: { prompt: '请心算：4 + 7 = ?', answer: 11 },
    questions: [
      {
        id: 'a-q1',
        prompt: '他们几点见面？',
        answer: '上午九点',
        choices: ['上午八点', '上午九点', '下午三点', '中午十二点'],
        category: '时间',
      },
      {
        id: 'a-q2',
        prompt: '小李约了谁？',
        answer: '小王',
        choices: ['小张', '小王', '小陈', '小赵'],
        category: '人物',
      },
      {
        id: 'a-q3',
        prompt: '他们在哪里见面？',
        answer: '市图书馆门口',
        choices: ['公司门口', '市图书馆门口', '火车站', '健身房'],
        category: '地点',
      },
      {
        id: 'a-q4',
        prompt: '见面后首先做什么？',
        answer: '讨论项目方案',
        choices: ['去吃饭', '讨论项目方案', '去健身', '看电影'],
        category: '任务',
      },
      {
        id: 'a-q5',
        prompt: '下午锻炼多久？',
        answer: '一小时',
        choices: ['半小时', '一小时', '两小时', '三小时'],
        category: '数字',
      },
    ],
  },
  {
    id: 'paper-b',
    title: '试卷 B · 出差行程',
    passage:
      '下周三早上七点半，张敏要去机场赶八点五十的航班，飞往杭州。她需要带上两份合同，到杭州后先去滨江区的客户公司开会，晚上住在西湖附近的酒店。',
    chunks: [
      { label: '时间', text: '下周三早上七点半 / 八点五十航班' },
      { label: '人物', text: '张敏' },
      { label: '地点', text: '机场 → 杭州滨江区 → 西湖附近酒店' },
      { label: '任务', text: '赶航班 → 带合同 → 开会' },
      { label: '数字', text: '两份合同' },
    ],
    withInterference: true,
    interference: { prompt: '请心算：9 - 3 = ?', answer: 6 },
    questions: [
      {
        id: 'b-q1',
        prompt: '张敏几点出发去机场？',
        answer: '七点半',
        choices: ['六点', '七点半', '八点', '九点'],
        category: '时间',
      },
      {
        id: 'b-q2',
        prompt: '出差的人是谁？',
        answer: '张敏',
        choices: ['李华', '张敏', '王芳', '赵强'],
        category: '人物',
      },
      {
        id: 'b-q3',
        prompt: '客户公司在哪个区？',
        answer: '滨江区',
        choices: ['西湖区', '滨江区', '余杭区', '上城区'],
        category: '地点',
      },
      {
        id: 'b-q4',
        prompt: '到杭州后首先做什么？',
        answer: '开会',
        choices: ['逛街', '开会', '吃饭', '回酒店'],
        category: '任务',
      },
      {
        id: 'b-q5',
        prompt: '需要带几份合同？',
        answer: '两份',
        choices: ['一份', '两份', '三份', '五份'],
        category: '数字',
      },
    ],
  },
  {
    id: 'paper-c',
    title: '试卷 C · 家庭聚会',
    passage:
      '这个周日下午两点，妈妈让小陈去超市买三斤苹果和两瓶牛奶。买完后直接送到外婆家，晚上一家人在外婆家吃火锅，大约八点半结束回家。',
    chunks: [
      { label: '时间', text: '周日下午两点 / 八点半回家' },
      { label: '人物', text: '妈妈、小陈、外婆' },
      { label: '地点', text: '超市 → 外婆家' },
      { label: '任务', text: '买东西 → 送到外婆家 → 吃火锅' },
      { label: '数字', text: '三斤苹果、两瓶牛奶' },
    ],
    withInterference: true,
    interference: { prompt: '请心算：5 × 2 = ?', answer: 10 },
    questions: [
      {
        id: 'c-q1',
        prompt: '小陈几点去超市？',
        answer: '下午两点',
        choices: ['上午十点', '中午十二点', '下午两点', '晚上六点'],
        category: '时间',
      },
      {
        id: 'c-q2',
        prompt: '是谁让小陈去买东西的？',
        answer: '妈妈',
        choices: ['爸爸', '妈妈', '外婆', '姐姐'],
        category: '人物',
      },
      {
        id: 'c-q3',
        prompt: '东西要送到哪里？',
        answer: '外婆家',
        choices: ['学校', '公司', '外婆家', '朋友家'],
        category: '地点',
      },
      {
        id: 'c-q4',
        prompt: '晚上一家人做什么？',
        answer: '吃火锅',
        choices: ['看电影', '吃火锅', '打牌', '散步'],
        category: '任务',
      },
      {
        id: 'c-q5',
        prompt: '要买几斤苹果？',
        answer: '三斤',
        choices: ['一斤', '两斤', '三斤', '五斤'],
        category: '数字',
      },
    ],
  },
];

export function getPaperById(id: string): Paper | undefined {
  return PAPERS.find((p) => p.id === id);
}

/** Pick a paper: sequential by index or random for practice */
export function pickPaper(preferId?: string): Paper {
  if (preferId) {
    const found = getPaperById(preferId);
    if (found) return found;
  }
  const idx = Math.floor(Math.random() * PAPERS.length);
  return PAPERS[idx];
}

export function pickPaperByIndex(index: number): Paper {
  return PAPERS[index % PAPERS.length];
}

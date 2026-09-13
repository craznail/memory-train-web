export interface PalaceSite {
  id: string;
  name: string;
}

export interface PalacePoint {
  id: string;
  label: string;
  text: string;
}

export const DEFAULT_HOME_ROUTE: PalaceSite[] = [
  { id: 'door', name: '门口' },
  { id: 'sofa', name: '沙发' },
  { id: 'table', name: '餐桌' },
  { id: 'fridge', name: '冰箱' },
  { id: 'balcony', name: '阳台' },
];

/** Listen-note chips from paper A (familiar weekend plan) */
export const PALACE_POINTS: PalacePoint[] = [
  { id: 'p-time', label: '时间', text: '周六上午九点' },
  { id: 'p-people', label: '人物', text: '小李、小王' },
  { id: 'p-place', label: '地点', text: '市图书馆门口' },
  { id: 'p-task', label: '任务', text: '讨论项目方案' },
  { id: 'p-num', label: '数字', text: '锻炼一小时' },
  { id: 'p-lunch', label: '任务', text: '面馆吃午餐' },
];

export const MAX_PER_SITE = 2;

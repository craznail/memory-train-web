/** Home header greeting by local time of day (visual v2 / issue #3). */
export function greetingFor(d: Date = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 11) return '早上好';
  if (h >= 11 && h < 13) return '中午好';
  if (h >= 13 && h < 18) return '下午好';
  return '晚上好';
}

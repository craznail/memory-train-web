export interface AssocDemo {
  id: string;
  points: string[];
  hook: string;
  /** Prefab illustration via deterministic placeholder */
  imageSeed: string;
}

export const ASSOC_DEMOS: AssocDemo[] = [
  {
    id: 'd1',
    points: ['小李', '图书馆门口', '上午九点'],
    hook: '小李把图书馆顶在头上当帽子，九点的闹钟当帽徽滴答响',
    imageSeed: 'library-alarm-hero',
  },
  {
    id: 'd2',
    points: ['张敏', '两份合同', '杭州'],
    hook: '张敏骑着两份卷成筒的合同当滑板，冲进杭州的西湖水花里',
    imageSeed: 'contract-skate-lake',
  },
];

export function prefabImageUrl(seed: string): string {
  // Deterministic colorful placeholder (no external API key required)
  const hue = Math.abs([...seed].reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue+40)%360},65%,40%)"/>
      </linearGradient></defs>
      <rect width="640" height="400" fill="url(#g)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="white" font-size="28" font-family="sans-serif">联想画面</text>
      <text x="50%" y="60%" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="16" font-family="sans-serif">${seed}</text>
    </svg>`,
  )}`;
}

/** Simulate image generation with delay; always returns prefab for now */
export async function generateAssociationImage(prompt: string): Promise<{ ok: boolean; url: string }> {
  await new Promise((r) => setTimeout(r, 900));
  if (!prompt.trim()) return { ok: false, url: '' };
  return { ok: true, url: prefabImageUrl(prompt.slice(0, 24) || 'assoc') };
}

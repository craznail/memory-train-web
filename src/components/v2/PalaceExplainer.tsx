/** 讲解用示意图：沿熟悉路线 1→5 安放信息。只读示意，不是交互功能（交互在 /studio/palace）。 */
const POS = [
  { x: 60, y: 46 },
  { x: 250, y: 56 },
  { x: 268, y: 140 },
  { x: 160, y: 176 },
  { x: 56, y: 140 },
];

export function PalaceExplainer({ stops }: { stops: readonly string[] }) {
  const pts = POS.slice(0, stops.length);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  return (
    <figure className="palace-explainer" data-testid="palace-explainer">
      <svg viewBox="0 0 320 236" width="100%" role="img" aria-label={`记忆宫殿路线示意：${stops.map((s, i) => `${i + 1} ${s}`).join('，')}`}>
        <rect x="6" y="6" width="308" height="224" rx="18" fill="#FFF3E4" stroke="#F6D7B5" />
        <path d="M24 118 H296 M160 18 V218" stroke="#F8E3CC" strokeWidth="6" strokeLinecap="round" />
        <path d={d} fill="none" stroke="var(--color-primary-score)" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={stops[i]}>
            <circle cx={p.x} cy={p.y} r="15" fill="var(--color-primary)" stroke="#fff" strokeWidth="3" />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">{i + 1}</text>
            <rect x={p.x - 26} y={p.y + 19} width="52" height="22" rx="11" fill="#FFFDF9" stroke="#F1CFAE" />
            <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-text)">{stops[i]}</text>
          </g>
        ))}
      </svg>
      <figcaption className="muted" style={{ textAlign: 'center', marginTop: 4 }}>示意：按 1→{stops.length} 的顺序走一圈</figcaption>
    </figure>
  );
}

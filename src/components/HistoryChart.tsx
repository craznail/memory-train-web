import type { ScoreBreakdown } from '../types';
import { formatScoreDate } from '../lib/storage';

interface Props {
  history: ScoreBreakdown[];
}

/** Simple SVG line chart for overall scores (oldest → newest left to right) */
export function HistoryChart({ history }: Props) {
  if (history.length === 0) return null;

  const points = [...history].reverse(); // chronological
  const w = 320;
  const h = 140;
  const pad = 24;
  const xs = points.map((_, i) =>
    points.length === 1
      ? w / 2
      : pad + (i * (w - pad * 2)) / (points.length - 1),
  );
  const ys = points.map((p) => {
    const v = Math.max(0, Math.min(100, p.overall));
    return h - pad - (v / 100) * (h - pad * 2);
  });
  const poly = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>综合分趋势</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E2E8F0" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#E2E8F0" />
        <polyline
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          points={poly}
        />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="4" fill="var(--color-primary)" />
        ))}
      </svg>
      <div className="stack" style={{ gap: 6, marginTop: 8 }}>
        {[...points].reverse().map((p, i) => (
          <div key={`${p.date}-${i}`} className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{formatScoreDate(p.date)}</span>
            <strong>{p.overall}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

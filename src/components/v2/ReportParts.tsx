import type { ReactNode } from 'react';
import type { CategoryStat, ScoreBreakdown, WeakCategory } from '../../types';
import { categoryPct, weakestTwo } from '../../lib/scoring';

/** Category icons — warm orange / cream only (#13). */
const ICON_PATHS: Record<WeakCategory, ReactNode> = {
  人物: (<><circle cx="12" cy="8.5" r="3.6" /><path d="M5 19.5c0-3.6 3.1-6 7-6s7 2.4 7 6z" /></>),
  时间: (<><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></>),
  地点: (<path d="M12 3a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6zm0 8.4a2.4 2.4 0 1 1 0-4.8 2.4 2.4 0 0 1 0 4.8z" />),
  任务: (<><rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M8.5 12.2l2.4 2.4 4.8-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></>),
  数字: (<text x="12" y="16" textAnchor="middle" fontSize="10.5" fontWeight="800" fontFamily="system-ui, sans-serif">123</text>),
};

export function CategoryIcon({ category, size = 34 }: { category: WeakCategory; size?: number }) {
  return (
    <span className="cat-icon" data-category={category} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">{ICON_PATHS[category]}</svg>
    </span>
  );
}

export function CategoryBars({ stats }: { stats: CategoryStat[] }) {
  return (
    <section className="card" aria-labelledby="cat-h">
      <div className="v2-section-h"><h2 id="cat-h">分类正确率</h2><span>看看哪类信息记得最牢</span></div>
      <ul className="cat-bars">
        {stats.map((s) => {
          const pct = categoryPct(s);
          return (
            <li key={s.category} data-testid="cat-bar">
              <CategoryIcon category={s.category} />
              <span className="cat-name">{s.category}</span>
              <span className="cat-track" aria-hidden="true"><span className="cat-fill" style={{ width: `${pct}%` }} /></span>
              <span className="cat-pct">{s.total ? `${pct}%` : '—'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 历次成绩: one point per formal test, oldest → newest. */
export function HistoryLine({ history }: { history: ScoreBreakdown[] }) {
  if (!history.length) return null;
  const pts = [...history].slice(0, 8).reverse();
  const W = 330, H = 170, L = 30, R = 14, T = 22, B = 30;
  const x = (i: number) => (pts.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - T - B);
  const line = pts.map((p, i) => `${x(i)},${y(p.overall)}`).join(' ');
  const area = `${x(0)},${y(0)} ${line} ${x(pts.length - 1)},${y(0)}`;
  const offset = history.length - pts.length;
  return (
    <section className="card" aria-labelledby="hist-h">
      <div className="v2-section-h"><h2 id="hist-h">历次成绩</h2><span>最近 {pts.length} 次正式测试</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`历次成绩：${pts.map((p) => p.overall).join('、')}`} data-testid="history-line">
        <defs>
          <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6A865" stopOpacity="0.35" /><stop offset="1" stopColor="#F6A865" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#F3DCC4" strokeDasharray={v ? '3 4' : undefined} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-secondary)">{v}</text>
          </g>
        ))}
        {pts.length > 1 && <polygon points={area} fill="url(#hist-fill)" />}
        <polyline points={line} fill="none" stroke="var(--color-primary-score)" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle cx={x(i)} cy={y(p.overall)} r="4.5" fill="var(--color-primary-score)" stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={y(p.overall) - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-primary-text)">{p.overall}</text>
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)">第{offset + i + 1}次</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

export function WeakCards({ stats }: { stats: CategoryStat[] }) {
  const weak = weakestTwo(stats);
  return (
    <section className="card" aria-labelledby="weak-h">
      <div className="v2-section-h"><h2 id="weak-h">弱项</h2><span>正确率最低的两类，优先多练</span></div>
      {weak.length === 0 ? (
        <p className="success-text" style={{ fontWeight: 600 }}>五类全部答对，暂无弱项，继续保持！</p>
      ) : (
        <div className="weak-grid">
          {weak.map((w) => (
            <div key={w.category} className="weak-card" data-testid="weak-card">
              <CategoryIcon category={w.category} size={38} />
              <div>
                <div className="weak-name">{w.category}</div>
                <div className="weak-sub">正确率 {w.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

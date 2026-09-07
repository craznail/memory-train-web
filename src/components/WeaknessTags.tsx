import type { WeakCategory } from '../types';

interface Props {
  weakPoints: WeakCategory[];
}

export function WeaknessTags({ weakPoints }: Props) {
  if (!weakPoints.length) {
    return (
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 6 }}>薄弱点</div>
        <p className="success-text" style={{ fontWeight: 600 }}>
          暂无明显薄弱点，继续保持！
        </p>
      </div>
    );
  }
  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 10 }}>薄弱点</div>
      <div className="tag-row">
        {weakPoints.map((w) => (
          <span key={w} className="weak-tag">
            {w}
          </span>
        ))}
      </div>
      <style>{`
        .tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .weak-tag {
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error);
          font-size: var(--font-aux);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

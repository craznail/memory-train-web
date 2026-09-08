import type { CategoryStat } from '../types';

interface Props {
  stats: CategoryStat[];
  interferencePassed?: boolean | null;
  antiInterferenceScore?: number;
}

export function CategoryBreakdown({
  stats,
  interferencePassed,
  antiInterferenceScore,
}: Props) {
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div style={{ fontWeight: 700 }}>听记细分</div>
      <p className="muted" style={{ marginTop: -4 }}>
        人物 / 时间 / 地点 / 任务 / 数字 正确率
      </p>
      {stats.map((s) => {
        const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
        return (
          <div key={s.category}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{s.category}</span>
              <strong>
                {s.total ? `${s.correct}/${s.total}（${pct}%）` : '—'}
              </strong>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(59,130,246,0.12)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background:
                    pct >= 80
                      ? 'var(--color-success)'
                      : pct >= 50
                        ? 'var(--color-primary)'
                        : 'var(--color-error)',
                }}
              />
            </div>
          </div>
        );
      })}
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          borderTop: '1px solid #E2E8F0',
          paddingTop: 10,
        }}
      >
        <span>抗干扰</span>
        <strong>
          {interferencePassed === true
            ? '通过'
            : interferencePassed === false
              ? '未通过'
              : antiInterferenceScore !== undefined
                ? `得分 ${antiInterferenceScore}`
                : '—'}
        </strong>
      </div>
    </div>
  );
}

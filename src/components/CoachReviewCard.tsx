import { useState } from 'react';

interface Props {
  tips: string[];
  onContinue: () => void;
  onSkip: () => void;
}

export function CoachReviewCard({ tips, onContinue, onSkip }: Props) {
  const [used, setUsed] = useState<Record<string, boolean>>({});

  const toggle = (tip: string) => {
    setUsed((prev) => ({ ...prev, [tip]: !prev[tip] }));
  };

  return (
    <div className="card stack">
      <div style={{ fontWeight: 800 }}>本段教练提示</div>
      <p className="muted">自检「用上了吗」——不计分，可跳过</p>
      {tips.length === 0 ? (
        <p className="muted">本段未出提示</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {tips.map((tip) => (
            <label
              key={tip}
              className="row"
              style={{
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(59,130,246,0.06)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!used[tip]}
                onChange={() => toggle(tip)}
              />
              <span style={{ flex: 1 }}>
                <strong>{tip}</strong>
                <span className="muted" style={{ marginLeft: 8 }}>
                  用上了
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
      <button type="button" className="btn-primary" onClick={onContinue}>
        开始答题
      </button>
      <button type="button" className="btn-secondary" onClick={onSkip}>
        跳过回顾
      </button>
    </div>
  );
}

import type { ScoreBreakdown } from '../types';
import { formatScoreDate } from '../lib/storage';

interface Props {
  score: ScoreBreakdown | null;
}

export function ScoreCard({ score }: Props) {
  return (
    <div className="card score-card">
      <div className="muted" style={{ marginBottom: 4 }}>
        听力记忆分
      </div>
      <div className="score-big">{score ? score.overall : '—'}</div>
      {score ? (
        <div className="stack" style={{ gap: 4, marginTop: 8 }}>
          <div className="muted">
            听觉 {score.auditory} · 抗干扰 {score.antiInterference}
          </div>
          <div className="muted">上次测评 {formatScoreDate(score.date)}</div>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 8 }}>
          完成一次「测听力」后生成分数
        </div>
      )}
      <style>{`
        .score-card { text-align: center; padding: 20px 16px; }
        .score-big {
          font-size: 56px;
          font-weight: 800;
          line-height: 1;
          color: var(--color-primary);
          letter-spacing: -1px;
        }
      `}</style>
    </div>
  );
}

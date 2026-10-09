import type { ScoreBreakdown } from '../types';
import { formatScoreDate } from '../lib/storage';
import scoreBars from '../assets/icons/icon-score-bars.svg';

interface Props {
  score: ScoreBreakdown | null;
}

/** Home header 「记忆分」 badge (visual v2). Same data as before: latest.overall. */
export function ScoreCard({ score }: Props) {
  const label = score
    ? `记忆分 ${score.overall}，上次测评 ${formatScoreDate(score.date)}`
    : '记忆分：完成一次「测听力」后生成分数';
  return (
    <div className="score-badge" role="img" aria-label={label} title={label}>
      <img src={scoreBars} alt="" aria-hidden="true" width={15} height={15} />
      <span className="score-badge-label">记忆分</span>
      <span className="score-badge-num">{score ? score.overall : '—'}</span>
      <style>{`
        .score-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 30px;
          padding: 0 12px;
          margin-top: 2px;
          border-radius: var(--radius-pill);
          background: linear-gradient(180deg, #FFFBF5, #FEF2E4);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: var(--shadow-badge);
          flex-shrink: 0;
        }
        .score-badge-label { font-size: var(--font-aux); color: var(--color-text); }
        .score-badge-num {
          font-size: 20px;
          font-weight: 800;
          line-height: 1;
          color: var(--color-primary-score);
          min-width: 1ch;
        }
      `}</style>
    </div>
  );
}

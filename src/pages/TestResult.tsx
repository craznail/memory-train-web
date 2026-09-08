import { Link, useLocation, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { WeaknessTags } from '../components/WeaknessTags';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { computeCategoryStats } from '../lib/scoring';
import type { AnswerRecord, ScoreBreakdown } from '../types';
import { getPaperById } from '../data/papers';
import { formatScoreDate } from '../lib/storage';

interface LocState {
  score: ScoreBreakdown;
  records: AnswerRecord[];
  paperId: string;
}

export function TestResult() {
  const loc = useLocation();
  const state = loc.state as LocState | null;
  if (!state?.score) return <Navigate to="/test" replace />;

  const { score, records } = state;
  const paper = getPaperById(state.paperId);
  const stats = score.categoryStats?.length
    ? score.categoryStats
    : computeCategoryStats(records);

  return (
    <Layout title="测评结果">
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div className="muted">综合记忆分</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: 'var(--color-primary)',
            lineHeight: 1,
            margin: '8px 0',
          }}
        >
          {score.overall}
        </div>
        <div className="muted">{formatScoreDate(score.date)}</div>
      </div>

      <div className="card stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>听觉记忆</span>
          <strong>{score.auditory}</strong>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>抗干扰</span>
          <strong>{score.antiInterference}</strong>
        </div>
        {paper && <div className="muted">试卷：{paper.title}</div>}
      </div>

      <CategoryBreakdown
        stats={stats}
        interferencePassed={
          score.interferencePassed ??
          (score.antiInterference >= 100 ? true : score.antiInterference <= 40 ? false : null)
        }
        antiInterferenceScore={score.antiInterference}
      />

      <WeaknessTags weakPoints={score.weakPoints} />

      <div className="card stack">
        <div style={{ fontWeight: 700 }}>答题明细</div>
        {records.map((r) => {
          const q = paper?.questions.find((x) => x.id === r.questionId);
          return (
            <div key={r.questionId} style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
              <div className="muted">
                [{r.category}] {q?.prompt}
              </div>
              <div className={r.correct ? 'success-text' : 'error-text'} style={{ fontWeight: 600 }}>
                {r.missed
                  ? '未作答'
                  : r.correct
                    ? `正确：${r.userAnswer}`
                    : `你的答案：${r.userAnswer}（应为 ${q?.answer}）`}
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/report" className="btn-primary">
        查看历史报告
      </Link>
      <Link to="/" className="btn-secondary">
        返回首页
      </Link>
      <Link to="/test" className="btn-secondary">
        再测一次
      </Link>
    </Layout>
  );
}

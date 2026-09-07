import { Link, useLocation, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import type { AnswerRecord, PracticeSummary } from '../types';
import { getPaperById } from '../data/papers';

interface LocState {
  summary: PracticeSummary;
  paperId: string;
  records: AnswerRecord[];
}

export function PracticeEnd() {
  const loc = useLocation();
  const state = loc.state as LocState | null;
  if (!state?.summary) return <Navigate to="/practice" replace />;

  const { summary, records, paperId } = state;
  const paper = getPaperById(paperId);

  return (
    <Layout title="练习结束">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted">本次练习（不计分）</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16 }}>
          <div>
            <div className="success-text" style={{ fontSize: 28, fontWeight: 800 }}>
              {summary.correct}
            </div>
            <div className="muted">正确</div>
          </div>
          <div>
            <div className="error-text" style={{ fontSize: 28, fontWeight: 800 }}>
              {summary.wrong}
            </div>
            <div className="muted">错误</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-secondary)' }}>
              {summary.missed}
            </div>
            <div className="muted">未答</div>
          </div>
        </div>
      </div>

      <div className="card stack">
        <div style={{ fontWeight: 700 }}>明细</div>
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
                    ? '正确'
                    : `错误（应为 ${q?.answer}）`}
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/practice" className="btn-primary">
        再练一次
      </Link>
      <Link to="/" className="btn-secondary">
        返回首页
      </Link>
    </Layout>
  );
}

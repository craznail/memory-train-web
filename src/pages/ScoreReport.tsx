import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { HistoryChart } from '../components/HistoryChart';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { WeaknessTags } from '../components/WeaknessTags';
import { loadScoreHistory, formatScoreDate } from '../lib/storage';

export function ScoreReport() {
  const { latest, history } = loadScoreHistory();

  return (
    <Layout title="能力报告">
      {!latest ? (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>还没有正式测评记录</div>
          <p className="muted">完成一次「测听力」后，这里会显示细分报告和历史曲线。</p>
          <Link to="/test" className="btn-primary">
            去测听力
          </Link>
        </div>
      ) : (
        <>
          <div className="card" style={{ textAlign: 'center', padding: 20 }}>
            <div className="muted">最近综合分</div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: 'var(--color-primary)',
                lineHeight: 1.1,
              }}
            >
              {latest.overall}
            </div>
            <div className="muted">{formatScoreDate(latest.date)}</div>
          </div>

          {latest.categoryStats && latest.categoryStats.length > 0 ? (
            <CategoryBreakdown
              stats={latest.categoryStats}
              interferencePassed={latest.interferencePassed}
              antiInterferenceScore={latest.antiInterference}
            />
          ) : (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>听记细分</div>
              <p className="muted">
                本次为旧存档，仅有综合分。新完成的正式测会显示五类正确率。
              </p>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
                <span>听觉记忆</span>
                <strong>{latest.auditory}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>抗干扰</span>
                <strong>{latest.antiInterference}</strong>
              </div>
            </div>
          )}

          <WeaknessTags weakPoints={latest.weakPoints} />
          <HistoryChart history={history} />
        </>
      )}

      <Link to="/" className="btn-secondary">
        返回首页
      </Link>
    </Layout>
  );
}

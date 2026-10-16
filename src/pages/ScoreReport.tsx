import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CategoryBars, HistoryLine, WeakCards } from '../components/v2/ReportParts';
import { Chevron } from '../components/v2/V2';
import { loadScoreHistory, formatScoreDate } from '../lib/storage';
import hero1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import hero2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';
import empty1x from '../assets/illustrations/elephant-empty@1x.webp';
import empty2x from '../assets/illustrations/elephant-empty@2x.webp';

export function ScoreReport() {
  const { latest, history } = loadScoreHistory();

  return (
    <Layout title="能力报告">
      {!latest ? (
        <div className="card report-empty enter">
          <img
            src={empty1x}
            srcSet={`${empty1x} 1x, ${empty2x} 2x`}
            width={180}
            height={150}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <div className="serif report-empty-t">还没有正式测评记录</div>
          <p className="muted report-empty-s">完成一次「测听力」后，这里会显示细分报告和历史曲线。</p>
          <Link to="/test" className="btn-gradient press">
            去测听力
          </Link>
          <style>{`
            .report-empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 8px;
              padding: 20px 20px 24px;
              border-radius: var(--radius-lg);
            }
            .report-empty img { object-fit: contain; }
            .report-empty-t { font-size: 19px; line-height: 1.35; margin-top: 4px; }
            .report-empty-s { max-width: 240px; line-height: 1.6; }
            .report-empty .btn-gradient { margin-top: 8px; padding: 0 40px; }
          `}</style>
        </div>
      ) : (
        <>
          <section className="card report-banner" aria-label="本次成绩">
            <img src={hero1x} srcSet={`${hero1x} 1x, ${hero2x} 2x`} alt="" aria-hidden="true" />
            <div className="inner">
              <h2>本次成绩</h2>
              <div className="muted">{formatScoreDate(latest.date)} · 正式测听力</div>
              <div className="total" data-testid="overall">
                <strong>{latest.overall}</strong>
                <span>/ 100</span>
              </div>
            </div>
          </section>

          {latest.categoryStats && latest.categoryStats.length > 0 ? (
            <>
              <CategoryBars stats={latest.categoryStats} />
              <HistoryLine history={history} />
              <WeakCards stats={latest.categoryStats} />
            </>
          ) : (
            <>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 6 }}>听记细分</div>
                <p className="muted">本次为旧存档，仅有综合分。新完成的正式测会显示五类正确率。</p>
              </div>
              <HistoryLine history={history} />
            </>
          )}

          <Link to="/practice" className="btn-gradient btn-cta press">
            去练习
            <Chevron />
          </Link>
        </>
      )}

      <Link to="/" className="btn-secondary">
        返回首页
      </Link>
    </Layout>
  );
}

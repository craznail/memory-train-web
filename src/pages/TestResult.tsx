import { Link, useLocation, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CategoryIcon } from '../components/v2/ReportParts';
import { computeCategoryStats, weakestTwo } from '../lib/scoring';
import type { AnswerRecord, ScoreBreakdown } from '../types';
import { getPaperById } from '../data/papers';
import hero1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import hero2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';

interface LocState {
  score: ScoreBreakdown;
  records: AnswerRecord[];
  paperId: string;
}

export type RowResult = 'correct' | 'wrong' | 'missed';
export function rowResult(r: AnswerRecord): RowResult {
  return r.missed ? 'missed' : r.correct ? 'correct' : 'wrong';
}

const MARK: Record<RowResult, string> = {
  correct: 'M5 12l5 5 9-10',
  wrong: 'M7 7l10 10M17 7L7 17',
  missed: 'M7 12h10',
};

export function TestResult() {
  const loc = useLocation();
  const state = loc.state as LocState | null;
  if (!state?.score) return <Navigate to="/test" replace />;

  const { score, records } = state;
  const paper = getPaperById(state.paperId);
  const stats = score.categoryStats?.length ? score.categoryStats : computeCategoryStats(records);
  const correct = records.filter((r) => r.correct).length;
  const weak = weakestTwo(stats);

  return (
    <Layout title="测听力">
      <section className="card report-banner res-banner" aria-label="测试完成">
        <img src={hero1x} srcSet={`${hero1x} 1x, ${hero2x} 2x`} alt="" aria-hidden="true" />
        <div className="inner">
          <h2>测试完成</h2>
          <div className="total" data-testid="result-score">
            <strong>{correct}</strong>
            <span>/ {records.length}</span>
          </div>
          <div className="sub">
            抗干扰<strong>{score.antiInterference}</strong>分
          </div>
        </div>
      </section>

      <ul className="stack" style={{ gap: 10 }}>
        {records.map((r, i) => {
          const q = paper?.questions.find((x) => x.id === r.questionId);
          const res = rowResult(r);
          return (
            <li key={r.questionId} className="card res-row" data-testid="result-row" style={{ listStyle: 'none' }}>
              <div className="res-cat">
                <CategoryIcon category={r.category} size={40} />
                <div>
                  <small>第 {i + 1} 题</small>
                  <b>{r.category}</b>
                </div>
              </div>
              <div className="res-ans" data-result={res}>
                <span className="mark" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d={MARK[res]} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {res === 'missed' ? (
                  <span>未作答</span>
                ) : res === 'correct' ? (
                  <span>正确：{r.userAnswer}</span>
                ) : (
                  <span>
                    你的答案：{r.userAnswer}
                    <small>（应为 {q?.answer ?? '—'}）</small>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="card" aria-labelledby="res-weak-h">
        <div className="v2-section-h">
          <h2 id="res-weak-h">弱项</h2>
          <span>正确率最低的类别，建议重点练习</span>
        </div>
        {weak.length ? (
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {weak.map((w) => (
              <span key={w.category} className="weak-chip" data-testid="weak-chip">
                <CategoryIcon category={w.category} size={28} />
                {w.category}
              </span>
            ))}
          </div>
        ) : (
          <p className="success-text" style={{ fontWeight: 600 }}>全部答对，暂无弱项！</p>
        )}
      </section>

      <Link to="/test" className="btn-gradient btn-cta press">
        再测一次
      </Link>
      <div className="btn-pair">
        <Link to="/report" className="btn-soft press">查看历史报告</Link>
        <Link to="/" className="btn-soft press">返回首页</Link>
      </div>
    </Layout>
  );
}

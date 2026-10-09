import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ScoreCard } from '../components/ScoreCard';
import { EntryCard } from '../components/EntryCard';
import { MethodStrip } from '../components/MethodStrip';
import { StudioCard, type StudioKey } from '../components/StudioCard';
import { loadScoreHistory } from '../lib/storage';
import { peekDailyProgress, type DailyProgress } from '../lib/dailyTraining';
import { greetingFor } from '../lib/greeting';
import type { ScoreHistory } from '../types';
import hero1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import hero2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';
import headphones1x from '../assets/illustrations/icon-test-headphones@1x.webp';
import headphones2x from '../assets/illustrations/icon-test-headphones@2x.webp';
import land1x from '../assets/illustrations/test-card-landscape@1x.webp';
import land2x from '../assets/illustrations/test-card-landscape@2x.webp';
import practiceIcon from '../assets/icons/icon-entry-practice.svg';
import reportIcon from '../assets/icons/icon-entry-report.svg';
import settingsIcon from '../assets/icons/icon-entry-settings.svg';

/** Home studio cards: short names + descriptions from Chole's reference image. */
// Lines wrap only at the \u200B phrase breaks (word-break: keep-all), so narrow cards never split a word.
/** Reference two-line descriptions (rendered one span per line = <br>). ZWSP marks the only allowed
 *  phrase breaks for 320px, where a line may wrap (max 3 lines). */
const HOME_STUDIOS: { studio: StudioKey; to: string; title: string; lines: string[] }[] = [
  { studio: 'imagery', to: '/studio/imagery', title: '成像', lines: ['在脑中\u200B构建画面', '让信息\u200B更深刻'] },
  { studio: 'encoding', to: '/studio/encoding', title: '编码', lines: ['把数字、\u200B文字', '变成\u200B有意义的代码'] },
  { studio: 'association', to: '/studio/association', title: '联想', lines: ['把新信息\u200B与熟悉的', '事物\u200B联系起来'] },
  { studio: 'palace', to: '/studio/palace', title: '宫殿', lines: ['在熟悉的\u200B空间中', '建立\u200B记忆线索'] },
];

const Chevron = ({ color = '#6B5449' }: { color?: string }) => (
  <svg width="7" height="12" viewBox="0 0 7 12" aria-hidden="true">
    <path d="M1 1l5 5-5 5" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ctaLabel(p: DailyProgress): string {
  if (p.completed) return '再练一组';
  return p.done > 0 ? '继续' : '开始';
}

export function Home() {
  const location = useLocation();
  const [history, setHistory] = useState<ScoreHistory>({ latest: null, history: [] });
  // Read-only: never creates today's plan (that happens on /daily).
  const [progress, setProgress] = useState<DailyProgress>(() => peekDailyProgress());
  const [greeting, setGreeting] = useState(() => greetingFor());

  useEffect(() => {
    setHistory(loadScoreHistory());
    setProgress(peekDailyProgress());
    setGreeting(greetingFor());
  }, [location.key]);

  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <div className="app-shell home">
      <header className="home-hdr enter">
        <div className="home-hdr-row">
          <h1 className="page-title">{greeting}</h1>
          <ScoreCard score={history.latest} />
        </div>
        <p className="page-sub home-sub">每一次专注的聆听，都是更强大记忆力的开始。</p>
      </header>

      <Link to="/daily" className="home-hero press enter" aria-label={`今日训练，进度 ${progress.done}/${progress.total}，${ctaLabel(progress)}`}>
        <img
          className="home-hero-bg"
          src={hero1x}
          srcSet={`${hero1x} 1x, ${hero2x} 2x`}
          width={347}
          height={170}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
        <span className="home-hero-in">
          <span className="serif home-hero-t">今日训练</span>
          <span className="home-hero-s">
            听一段语音，
            <br />
            回忆时间、人物、地点、数字
          </span>
          <span className="home-progress">
            <span className="home-progress-n">
              <b>{progress.done}</b>/{progress.total}
            </span>
            <span className="home-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="今日进度">
              <span className="home-progress-fill" style={{ width: `${pct}%` }} />
            </span>
            {progress.completed && <span className="home-progress-done">今日已完成</span>}
          </span>
          <span className="btn-gradient home-hero-btn">
            {ctaLabel(progress)} <Chevron color="#fff" />
          </span>
        </span>
      </Link>

      <Link to="/test" className="card home-test press enter">
        <img className="home-test-land" src={land1x} srcSet={`${land1x} 1x, ${land2x} 2x`} width={150} height={68} alt="" aria-hidden="true" loading="lazy" />
        <span className="home-test-icon">
          <img src={headphones1x} srcSet={`${headphones1x} 1x, ${headphones2x} 2x`} width={44} height={44} alt="" aria-hidden="true" />
        </span>
        <span className="home-test-body">
          <span className="serif home-test-t">测听力</span>
          <span className="home-test-s">测出你的听觉记忆水平</span>
        </span>
        <span className="home-test-chev"><Chevron color="#5A3A2C" /></span>
      </Link>

      <section className="home-sec enter">
        <div className="home-sec-hd">
          <h2 className="serif">学方法</h2>
          <Link to="/methods" className="home-sec-more">
            <span className="cap-full">探索 6 种记忆方法，构建你的记忆力体系</span>
            <span className="cap-short">探索 6 种记忆方法</span> <Chevron />
          </Link>
        </div>
        <MethodStrip />
      </section>

      <section className="home-sec enter">
        <div className="home-sec-hd">
          <h2 className="serif">练习台</h2>
          <span className="home-sec-more">
            <span className="cap-full">多样化练习，提升你的听觉记忆能力</span>
            <span className="cap-short">多样化练习，提升听觉记忆</span>
          </span>
        </div>
        <div className="home-grid">
          {HOME_STUDIOS.map((s) => (
            <StudioCard key={s.to} {...s} />
          ))}
        </div>
      </section>

      <nav className="home-bottom enter" aria-label="更多">
        <EntryCard to="/practice" icon={practiceIcon} title="练听力" subtitle="不改分" />
        <EntryCard to="/report" icon={reportIcon} title="能力报告" subtitle="看看你的进步" />
        <EntryCard to="/settings" icon={settingsIcon} title="设置" subtitle="个性化你的训练体验" />
      </nav>

      <style>{`
        .home { gap: var(--gap-card); padding-top: 12px; }
        .home-hdr { padding: 0 0 0 calc(var(--text-x) - var(--page-x)); }
        .home-hdr-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .home-sub { margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 359px) { .home-sub { font-size: 12px; } }
        .home-hero {
          position: relative;
          display: block;
          height: 186px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-hero);
          border: 1px solid rgba(255, 255, 255, 0.9);
          background: #FEE6C2;
        }
        .home-hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        /* text column: left 190px only, never over the elephant's head/face/headphones */
        .home-hero-in {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 190px;
          padding: 16px 0 0 16px;
          box-sizing: content-box;
        }
        .home-hero-t { font-size: var(--font-hero); line-height: 1.2; }
        .home-hero-s { margin-top: 6px; font-size: var(--font-aux); line-height: 1.45; white-space: nowrap; }
        .home-progress { display: flex; align-items: center; gap: 6px; margin-top: 8px; height: 22px; max-width: 190px; }
        .home-progress-n { font-size: 14px; font-weight: 700; color: var(--color-primary-text); min-width: 28px; white-space: nowrap; }
        .home-progress-n b { font-size: 20px; font-weight: 800; }
        .home-progress-track {
          position: relative;
          width: 68px;
          flex-shrink: 0;
          height: 8px;
          border-radius: var(--radius-pill);
          background: var(--color-track);
          overflow: hidden;
        }
        .home-progress-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
          background: linear-gradient(90deg, #F7A13C, #E8691F);
        }
        .home-progress-done {
          font-size: var(--font-caption);
          font-weight: 700;
          color: var(--color-success);
          background: var(--color-success-soft);
          border-radius: var(--radius-pill);
          padding: 1px 7px;
          white-space: nowrap;
        }
        .home-hero-btn { margin-top: 10px; }
        @media (max-width: 359px) {
          .home-hero-bg { object-position: right center; }
          .home-hero-s { font-size: 12px; }
          .home-progress-track { width: 56px; }
        }
        .home-test {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          height: 68px;
          padding: 0 14px 0 10px;
        }
        .home-test-land { position: absolute; right: 0; bottom: 0; }
        .home-test-icon {
          position: relative;
          width: 62px;
          height: 52px;
          flex-shrink: 0;
          border-radius: var(--radius-sm);
          background: linear-gradient(180deg, #FFEBD3, #FDDDB7);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .home-test-body { position: relative; display: flex; flex-direction: column; margin-left: 14px; }
        .home-test-t { font-size: var(--font-card-title); line-height: 1.2; }
        .home-test-s { font-size: var(--font-aux); color: var(--color-text-secondary); margin-top: 2px; }
        .home-test-chev { position: relative; margin-left: auto; display: flex; padding: 16px 0 16px 16px; }
        .home-sec { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
        .home-sec-hd {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 0 calc(var(--text-x) - var(--page-x));
        }
        .home-sec-hd h2 { font-size: var(--font-section); line-height: 1.3; }
        .home-sec-more {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          font-size: var(--font-caption);
          color: var(--color-text-secondary);
        }
        .home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap-grid); }
        .home-bottom { display: flex; gap: 6px; }
        .home-bottom > * { flex: 1 1 auto; }
        .cap-short { display: none; }
        @media (max-width: 359px) {
          .cap-full { display: none; }
          .cap-short { display: inline; }
          .home-bottom > * { flex: 1 1 0; }
        }
      `}</style>
    </div>
  );
}

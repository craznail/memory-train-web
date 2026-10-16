import type { PlayStatus } from '../../lib/audio';
import type { Question } from '../../types';

export function Chevron() {
  return (
    <svg className="chev" width="9" height="15" viewBox="0 0 7 12" aria-hidden="true">
      <path d="M1 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProgressBar({ index, total }: { index: number; total: number }) {
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  return (
    <div className="v2-progress">
      <div className="v2-progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label={`第 ${index + 1}/${total} 题`}>
        <div className="v2-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="v2-progress-label" aria-hidden="true">
        第 <strong>{index + 1}</strong>/{total} 题
      </span>
    </div>
  );
}

const WAVE = [10, 18, 26, 14, 30, 22, 12, 28, 16, 24, 10, 20, 14];
interface PlayCardProps {
  phase: string;
  playedOnce: boolean;
  playStatus?: PlayStatus;
  onPlay: () => void;
  img1x: string;
  img2x: string;
  note?: string;
}
/** v2 single-play card: 仅播放一次 → 播放中 → 已播放（disabled）. */
export function PlayCard({ phase, playedOnce, playStatus = 'idle', onPlay, img1x, img2x, note }: PlayCardProps) {
  const playing = phase === 'playing';
  const played = playedOnce && !playing;
  const state = playing ? 'playing' : played ? 'played' : 'ready';
  const label = playing ? (playStatus === 'loading' ? '加载中…' : '播放中…') : played ? '已播放' : '播放听力材料';
  return (
    <div className="card v2-play-card" data-testid="play-card" data-state={state}>
      <img className="bg" src={img1x} srcSet={`${img1x} 1x, ${img2x} 2x`} alt="" aria-hidden="true" />
      <div className="inner">
        {!played && (
        <span className="v2-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="var(--color-primary)" /></svg>
          仅播放一次
        </span>
        )}
        <div className="v2-play-row">
          <button type="button" className="v2-play-btn press" data-state={state} disabled={playing || played} onClick={onPlay} aria-label={label}>
            {played ? (
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="#fff" opacity="0.9" /></svg>
            ) : playing ? (
              <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="#fff" /><rect x="14" y="5" width="4" height="14" rx="1" fill="#fff" /></svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="#fff" /></svg>
            )}
          </button>
          {state === 'ready' ? (
            <div className="v2-wave" aria-hidden="true">{WAVE.map((h, i) => <i key={i} style={{ height: h }} />)}</div>
          ) : (
            <span className="v2-play-state" role="status">{label}</span>
          )}
        </div>
        {playing && playStatus === 'error' ? (
          <p className="v2-play-note">预录加载失败，已切换系统语音兜底</p>
        ) : (
          <p className="v2-play-note">{played ? '材料已播放，不可重听' : note ?? '请集中注意力，材料只播放一次'}</p>
        )}
      </div>
    </div>
  );
}

/** v2 four-choice list. Selected = orange border + light orange bg; never shows right/wrong. */
export function ChoiceList({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  return (
    <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label={question.prompt}>
      {(question.choices ?? []).map((c, i) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} className={`opt-v2 press${value === c ? ' selected' : ''}`} onClick={() => onChange(c)}>
          <span className="letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
          <span>{c}</span>
        </button>
      ))}
    </div>
  );
}

export function StepDots({ steps, active }: { steps: readonly string[]; active: number }) {
  return (
    <ol className="v2-stepper" aria-label="学习步骤">
      {steps.map((s, i) => (
        <li key={s} className={`v2-step${i === active ? ' active' : ''}${i < active ? ' done' : ''}`} aria-current={i === active ? 'step' : undefined}>
          <span className="num">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

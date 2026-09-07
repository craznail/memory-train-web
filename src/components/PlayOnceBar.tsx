import type { PlayStatus } from '../lib/audio';

interface Props {
  phase: string;
  playedOnce: boolean;
  onPlay: () => void;
  label?: string;
  allowReplay?: boolean;
  hint?: string;
  playStatus?: PlayStatus;
}

export function PlayOnceBar({
  phase,
  playedOnce,
  onPlay,
  label = '播放听力材料（仅一次）',
  allowReplay = false,
  hint,
  playStatus = 'idle',
}: Props) {
  const playing = phase === 'playing' || phase === 'replaying';
  const locked = playedOnce && !allowReplay && !playing;
  const loading = playing && playStatus === 'loading';
  const fallback = playing && playStatus === 'error';
  const disabled = playing || (playedOnce && !allowReplay);

  const barClass = [
    'card',
    'play-bar',
    playing ? 'play-bar--playing' : '',
    locked ? 'play-bar--locked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let buttonLabel = label;
  if (loading) buttonLabel = '加载中…';
  else if (playing) buttonLabel = '播放中…';
  else if (locked) buttonLabel = '已播放（不可重听）';

  return (
    <div className={barClass}>
      <button
        type="button"
        className={playing ? 'btn-primary play-bar-btn--playing' : 'btn-primary'}
        disabled={disabled}
        onClick={onPlay}
      >
        {buttonLabel}
      </button>
      {fallback && (
        <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          预录加载失败，已切换系统语音兜底
        </p>
      )}
      {hint && !fallback && (
        <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          {hint}
        </p>
      )}
      {!hint && !allowReplay && !fallback && (
        <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          请集中注意力，材料只播放一次
        </p>
      )}
    </div>
  );
}

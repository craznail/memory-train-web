interface Props {
  phase: string;
  playedOnce: boolean;
  onPlay: () => void;
  label?: string;
  allowReplay?: boolean;
  hint?: string;
}

export function PlayOnceBar({
  phase,
  playedOnce,
  onPlay,
  label = '播放听力材料（仅一次）',
  allowReplay = false,
  hint,
}: Props) {
  const playing = phase === 'playing' || phase === 'replaying';
  const locked = playedOnce && !allowReplay && !playing;
  const disabled = playing || (playedOnce && !allowReplay);

  const barClass = [
    'card',
    'play-bar',
    playing ? 'play-bar--playing' : '',
    locked ? 'play-bar--locked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={barClass}>
      <button
        type="button"
        className={playing ? 'btn-primary play-bar-btn--playing' : 'btn-primary'}
        disabled={disabled}
        onClick={onPlay}
      >
        {playing ? '播放中…' : locked ? '已播放（不可重听）' : label}
      </button>
      {hint && (
        <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          {hint}
        </p>
      )}
      {!hint && !allowReplay && (
        <p className="muted" style={{ marginTop: 8, textAlign: 'center' }}>
          请集中注意力，材料只播放一次
        </p>
      )}
    </div>
  );
}

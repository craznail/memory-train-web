interface Props {
  tip: string | null;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  visible: boolean;
}

export function CoachBar({ tip, enabled, onToggle, visible }: Props) {
  if (!visible) return null;
  return (
    <div
      className="card"
      style={{
        position: 'relative',
        padding: '10px 14px',
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.2)',
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          fontSize: 12,
          fontWeight: 700,
          border: 'none',
          background: enabled ? 'var(--color-primary)' : '#CBD5E1',
          color: '#fff',
          borderRadius: 999,
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        教练 {enabled ? '开' : '关'}
      </button>
      {enabled && tip ? (
        <p style={{ fontWeight: 700, marginRight: 64, marginBottom: 0 }}>{tip}</p>
      ) : (
        <p className="muted" style={{ marginRight: 64, marginBottom: 0 }}>
          {enabled ? '播放后出现节奏提示' : '本局教练已关'}
        </p>
      )}
    </div>
  );
}

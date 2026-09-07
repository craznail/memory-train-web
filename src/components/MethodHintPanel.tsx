interface Props {
  title: string;
  cues: string[];
  visible: boolean;
  /** tagsOnly: round-2 listen; full shows helper text */
  mode?: 'tagsOnly' | 'full';
  helper?: string;
}

export function MethodHintPanel({
  title,
  cues,
  visible,
  mode = 'tagsOnly',
  helper,
}: Props) {
  if (!visible) return null;
  return (
    <div className="card grouping-panel">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {helper && (
        <p className="muted" style={{ marginBottom: 12 }}>
          {helper}
        </p>
      )}
      <div className="chunk-tags">
        {cues.map((c) => (
          <span key={c} className="chunk-tag">
            {c}
          </span>
        ))}
      </div>
      {mode === 'full' && (
        <p className="muted" style={{ marginTop: 12 }}>
          记住这些挂钩维度；答题时不会再展示具体答案。
        </p>
      )}
      <style>{`
        .chunk-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .chunk-tag {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-primary);
          font-size: var(--font-body);
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

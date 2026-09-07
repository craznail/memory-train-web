import type { ChunkHint } from '../types';

interface Props {
  chunks: ChunkHint[];
  visible: boolean;
  /** tagsOnly: only dimension labels, no answer content (for teach replay listen) */
  mode?: 'full' | 'tagsOnly';
}

export function GroupingHintPanel({ chunks, visible, mode = 'full' }: Props) {
  if (!visible) return null;
  const tagsOnly = mode === 'tagsOnly';
  return (
    <div className="card grouping-panel">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>分组提示（Chunking）</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {tagsOnly
          ? '播放时只看维度标签，把听到的信息往这些格子里归——不展示具体内容'
          : '边听边按「人物 / 时间 / 地点 / 任务 / 数字」归类记忆'}
      </p>
      {tagsOnly ? (
        <div className="chunk-tags">
          {chunks.map((c) => (
            <span key={c.label} className="chunk-tag">
              {c.label}
            </span>
          ))}
        </div>
      ) : (
        <ul className="chunk-list">
          {chunks.map((c) => (
            <li key={c.label} className="chunk-item">
              <span className="chunk-label">{c.label}</span>
              <span className="chunk-text">{c.text}</span>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .chunk-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .chunk-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 12px;
          background: rgba(59, 130, 246, 0.06);
          border-radius: var(--radius-md);
        }
        .chunk-label {
          font-size: var(--font-aux);
          font-weight: 700;
          color: var(--color-primary);
        }
        .chunk-text { font-size: var(--font-body); }
        .chunk-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
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

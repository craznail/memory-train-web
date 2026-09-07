import type { ChunkHint } from '../types';

interface Props {
  chunks: ChunkHint[];
  visible: boolean;
}

export function GroupingHintPanel({ chunks, visible }: Props) {
  if (!visible) return null;
  return (
    <div className="card grouping-panel">
      <div style={{ fontWeight: 700, marginBottom: 8 }}>分组提示（Chunking）</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        边听边按「人物 / 时间 / 地点 / 任务 / 数字」归类记忆
      </p>
      <ul className="chunk-list">
        {chunks.map((c) => (
          <li key={c.label} className="chunk-item">
            <span className="chunk-label">{c.label}</span>
            <span className="chunk-text">{c.text}</span>
          </li>
        ))}
      </ul>
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
      `}</style>
    </div>
  );
}

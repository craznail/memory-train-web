import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { METHODS } from '../data/methods';

export function MethodsList() {
  return (
    <Layout title="记忆方法">
      <p className="muted" style={{ marginBottom: 8 }}>
        按优先级逐个开放。教学不计正式分。
      </p>
      <div className="stack">
        {METHODS.map((m, i) => {
          const ready = m.status === 'ready';
          const inner = (
            <div
              className={`card entry-card${ready ? '' : ' method-locked'}`}
              style={{ opacity: ready ? 1 : 0.55 }}
            >
              <div className="entry-emoji">{m.emoji}</div>
              <div className="entry-body">
                <div className="entry-title">
                  {i + 1}. {m.title}
                </div>
                <div className="muted">{m.subtitle}</div>
              </div>
              <div className="entry-arrow">{ready ? '›' : '锁'}</div>
            </div>
          );
          return ready ? (
            <Link key={m.id} to={`/teach/${m.id}`} style={{ textDecoration: 'none' }}>
              {inner}
            </Link>
          ) : (
            <div key={m.id}>{inner}</div>
          );
        })}
      </div>
      <style>{`
        .entry-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }
        .entry-emoji {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(59, 130, 246, 0.1);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
        }
        .entry-body { flex: 1; min-width: 0; }
        .entry-title { font-weight: 700; margin-bottom: 2px; }
        .entry-arrow { font-size: 20px; color: var(--color-text-secondary); }
      `}</style>
    </Layout>
  );
}

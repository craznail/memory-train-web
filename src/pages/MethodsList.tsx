import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { METHODS } from '../data/methods';

const STUDIOS = [
  {
    to: '/studio/imagery',
    emoji: '🏋️',
    title: '成像健身房',
    subtitle: '两词挂钩热身 · 练习台',
  },
  {
    to: '/studio/encoding',
    emoji: '🔢',
    title: '编码码表',
    subtitle: '0–9 意象表 + 双向小练',
  },
  {
    to: '/studio/association',
    emoji: '🖼️',
    title: '生图联想',
    subtitle: '示范画面 + 自造配图',
  },
];

export function MethodsList() {
  return (
    <Layout title="记忆方法">
      <p className="muted" style={{ marginBottom: 8 }}>
        先练工作室，再看速览。不计正式分。
      </p>

      <div style={{ fontWeight: 800, margin: '8px 0' }}>方法工作室</div>
      <div className="stack">
        {STUDIOS.map((s) => (
          <Link key={s.to} to={s.to} style={{ textDecoration: 'none' }}>
            <div className="card entry-card" style={{ border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="entry-emoji">{s.emoji}</div>
              <div className="entry-body">
                <div className="entry-title">{s.title}</div>
                <div className="muted">{s.subtitle}</div>
              </div>
              <div className="entry-arrow">›</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ fontWeight: 800, margin: '16px 0 8px' }}>方法速览</div>
      <p className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
        旧四步薄课，快速回顾原理
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
                <div className="muted">{m.subtitle} · 速览</div>
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

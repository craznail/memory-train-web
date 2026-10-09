import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { METHODS } from '../data/methods';
import { METHOD_ICONS } from '../components/MethodStrip';
import { StudioCard, type StudioKey } from '../components/StudioCard';

const STUDIOS: { studio: StudioKey; to: string; title: string; subtitle: string }[] = [
  {
    studio: 'imagery',
    to: '/studio/imagery',
    title: '成像健身房',
    subtitle: '两词挂钩热身 · 练习台',
  },
  {
    studio: 'encoding',
    to: '/studio/encoding',
    title: '编码码表',
    subtitle: '0–9 意象表 + 双向小练',
  },
  {
    studio: 'association',
    to: '/studio/association',
    title: '生图联想',
    subtitle: '示范画面 + 自造配图',
  },
  {
    studio: 'palace',
    to: '/studio/palace',
    title: '宫殿工作台',
    subtitle: '位点放置 · 走一圈回忆',
  },
];

/** Split existing subtitle copy into two card lines (text unchanged): "A · B" → ["A", "· B"], "A + B" → ["A", "+ B"]. */
function cardLines(subtitle: string): string[] {
  const m = subtitle.match(/^(.*?)\s+([·+]\s.*)$/);
  return m ? [m[1], m[2]] : [subtitle];
}

const Chevron = () => (
  <svg width="7" height="12" viewBox="0 0 7 12" aria-hidden="true">
    <path d="M1 1l5 5-5 5" fill="none" stroke="#5A3A2C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function MethodsList() {
  return (
    <Layout title="记忆方法">
      <p className="page-sub methods-intro">先练工作室，再看速览。不计正式分。</p>

      <section className="methods-sec enter">
        <div className="methods-sec-hd">
          <h2 className="serif">方法工作室</h2>
        </div>
        <div className="methods-grid">
          {STUDIOS.map((s) => (
            <StudioCard key={s.to} studio={s.studio} to={s.to} title={s.title} lines={cardLines(s.subtitle)} size="methods" />
          ))}
        </div>
      </section>

      <section className="methods-sec enter">
        <div className="methods-sec-hd">
          <h2 className="serif">方法速览</h2>
          <span className="methods-sec-more">旧四步薄课，快速回顾原理</span>
        </div>
        <ol className="card methods-list">
          {METHODS.map((m, i) => {
            const ready = m.status === 'ready';
            const inner = (
              <>
                <img src={METHOD_ICONS[m.id]} alt="" aria-hidden="true" width={44} height={44} className="methods-row-icon" />
                <span className="methods-row-body">
                  <span className="methods-row-title">
                    {i + 1}. {m.title}
                  </span>
                  <span className="methods-row-sub">{m.subtitle} · 速览</span>
                </span>
                <span className="methods-row-end">{ready ? <Chevron /> : '锁'}</span>
              </>
            );
            return (
              <li key={m.id} className={`methods-row${ready ? '' : ' method-locked'}`} style={ready ? undefined : { opacity: 0.55 }}>
                {ready ? (
                  <Link to={`/teach/${m.id}`} className="methods-row-in press">
                    {inner}
                  </Link>
                ) : (
                  <div className="methods-row-in">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <style>{`
        .methods-intro { margin-top: -4px; padding-left: calc(var(--text-x) - var(--page-x)); }
        .methods-sec { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
        .methods-sec-hd {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          padding: 0 calc(var(--text-x) - var(--page-x));
        }
        .methods-sec-hd h2 { font-size: var(--font-section); line-height: 1.3; white-space: nowrap; }
        .methods-sec-more {
          font-size: var(--font-caption);
          color: var(--color-text-secondary);
          text-align: right;
        }
        .methods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap-grid); }
        .methods-list {
          list-style: none;
          border-radius: var(--radius-lg);
          padding: 4px 0;
        }
        .methods-row + .methods-row { border-top: 1px solid rgba(232, 200, 170, 0.45); }
        .methods-row-in {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 64px;
          padding: 10px 14px;
        }
        .methods-row-icon { flex-shrink: 0; }
        .methods-row-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .methods-row-title { font-size: 16px; font-weight: 700; line-height: 1.35; }
        .methods-row-sub {
          font-size: var(--font-caption);
          color: var(--color-text-tertiary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .methods-row-end {
          flex-shrink: 0;
          display: flex;
          font-size: var(--font-aux);
          color: var(--color-text-secondary);
        }
      `}</style>
    </Layout>
  );
}

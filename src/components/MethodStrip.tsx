import { Link } from 'react-router-dom';
import { METHODS } from '../data/methods';
import chunking from '../assets/icons/icon-method-chunking.svg';
import association from '../assets/icons/icon-method-association.svg';
import story from '../assets/icons/icon-method-story.svg';
import encoding from '../assets/icons/icon-method-encoding.svg';
import imagery from '../assets/icons/icon-method-imagery.svg';
import palace from '../assets/icons/icon-method-palace.svg';
import connector from '../assets/icons/icon-connector.svg';

export const METHOD_ICONS: Record<string, string> = {
  chunking,
  association,
  story,
  encoding,
  imagery,
  palace,
};

/** Home-only short labels from Chole's reference image (copy only; methods.ts unchanged). */
const HOME_LABELS: Record<string, { name: string; desc: [string, string] }> = {
  chunking: { name: '分组', desc: ['把杂乱', '变有序'] },
  association: { name: '联想', desc: ['让记忆', '更生动'] },
  story: { name: '故事', desc: ['用故事', '串起信息'] },
  encoding: { name: '编码', desc: ['把信息', '变代码'] },
  imagery: { name: '成像', desc: ['在脑中', '看见它'] },
  palace: { name: '记忆宫殿', desc: ['建立你的', '记忆宫殿'] },
};

/** 学方法 path: 6 round icons joined by connector dots; all 6 fit at 375 wide. */
export function MethodStrip() {
  return (
    <nav className="method-strip" aria-label="学方法">
      <ol className="method-strip-row">
        {METHODS.map((m, i) => {
          const label = HOME_LABELS[m.id] ?? { name: m.title, desc: ['', ''] as [string, string] };
          const ready = m.status === 'ready';
          const body = (
            <>
              <img src={METHOD_ICONS[m.id]} alt="" aria-hidden="true" width={46} height={46} />
              <span className="method-strip-name">{label.name}</span>
              <span className="method-strip-desc">
                {label.desc[0]}
                <br />
                {label.desc[1]}
              </span>
            </>
          );
          return (
            <li key={m.id} className="method-strip-item" style={ready ? undefined : { opacity: 0.55 }}>
              {i > 0 && <img className="method-strip-conn" src={connector} alt="" aria-hidden="true" width={8} height={6} />}
              {ready ? (
                <Link to={`/teach/${m.id}`} className="method-strip-link" aria-label={`${m.title}：${label.desc.join('')}`}>
                  {body}
                </Link>
              ) : (
                <span className="method-strip-link" aria-disabled="true">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
      <style>{`
        .method-strip {
          margin: 0 calc(-1 * var(--page-x));
          background: linear-gradient(180deg, rgba(255, 252, 247, 0.92), rgba(254, 245, 234, 0.92));
          border-top: var(--border-card);
          border-bottom: var(--border-card);
          box-shadow: var(--shadow-card);
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }
        .method-strip::-webkit-scrollbar { display: none; }
        .method-strip-row {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(6, minmax(54px, 1fr));
          padding: 10px 4px 9px;
          min-width: 100%;
        }
        .method-strip-item { position: relative; scroll-snap-align: start; min-width: 0; }
        .method-strip-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-height: 44px;
          padding: 0 1px;
        }
        .method-strip-conn {
          position: absolute;
          left: -4px;
          top: 20px;
          opacity: 0.9;
        }
        .method-strip-name {
          margin-top: 5px;
          font-size: 12.5px;
          font-weight: 700;
          line-height: 1.25;
          white-space: nowrap;
        }
        .method-strip-desc {
          margin-top: 2px;
          font-size: 10.5px;
          line-height: 1.3;
          color: var(--color-text-tertiary);
          white-space: nowrap;
        }
      `}</style>
    </nav>
  );
}

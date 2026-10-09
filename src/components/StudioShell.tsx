import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from './Layout';
import { STUDIO_ART, type StudioKey } from './StudioCard';

interface Props {
  title: string;
  step: number;
  total: number;
  children: ReactNode;
}

const STUDIO_BY_TITLE: Record<string, StudioKey> = {
  成像健身房: 'imagery',
  编码码表: 'encoding',
  生图联想: 'association',
  宫殿工作台: 'palace',
};

/** Studio page header as an illustrated card (visual v2 · studios.png). No elephant here. */
export function StudioShell({ title, step, total, children }: Props) {
  const key = STUDIO_BY_TITLE[title];
  const art = key ? STUDIO_ART[key] : null;
  return (
    <Layout bare>
      <header className="card studio-head enter">
        {art && (
          <img
            className="studio-head-art"
            src={art.x1}
            srcSet={`${art.x1} 1x, ${art.x2} 2x`}
            width={132}
            height={112}
            alt=""
            aria-hidden="true"
          />
        )}
        <Link to="/methods" className="studio-head-back">
          <svg width="7" height="12" viewBox="0 0 7 12" aria-hidden="true">
            <path d="M6 1L1 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          方法列表
        </Link>
        <h1 className="serif studio-head-t">{title}</h1>
        <p className="studio-head-s">练习台 · 不计正式分</p>
        <div className="studio-head-dots" role="img" aria-label={`第 ${step} 步，共 ${total} 步`}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={i < step ? 'on' : undefined} />
          ))}
        </div>
      </header>
      {children}
      <style>{`
        .studio-head {
          position: relative;
          overflow: hidden;
          min-height: 124px;
          padding: 12px 16px 30px;
          border-radius: var(--radius-lg);
        }
        .studio-head-art { position: absolute; right: 0; bottom: 0; object-fit: contain; }
        .studio-head-back {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 24px;
          font-size: var(--font-aux);
          font-weight: 700;
          color: var(--color-primary-text);
        }
        .studio-head-t {
          position: relative;
          margin-top: 2px;
          font-size: 24px;
          line-height: 1.25;
          max-width: calc(100% - 110px);
        }
        .studio-head-s { position: relative; font-size: var(--font-aux); color: var(--color-text-secondary); }
        .studio-head-dots { position: absolute; left: 16px; bottom: 12px; display: flex; gap: 6px; }
        .studio-head-dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--color-track); }
        .studio-head-dots span.on { background: var(--color-primary); }
        @media (max-width: 359px) {
          .studio-head-art { width: 110px; height: 93px; }
        }
      `}</style>
    </Layout>
  );
}

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Props {
  title?: string;
  showBack?: boolean;
  children: ReactNode;
}

export function Layout({ title, showBack = true, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        {showBack ? (
          <Link to="/" className="back-link">
            <svg width="8" height="14" viewBox="0 0 7 12" aria-hidden="true">
              <path d="M6 1L1 6l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            首页
          </Link>
        ) : (
          <span className="brand">听力记忆训练</span>
        )}
        {title && <h1 className="page-title">{title}</h1>}
      </header>
      <main className="stack" style={{ flex: 1 }}>
        {children}
      </main>
      <style>{`
        .app-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0 calc(var(--text-x) - var(--page-x));
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          font-size: 15px;
          color: var(--color-primary-text);
          font-weight: 700;
          width: fit-content;
        }
        .brand {
          font-size: var(--font-aux);
          color: var(--color-text-secondary);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

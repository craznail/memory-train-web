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
            ← 首页
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
        .app-header { display: flex; flex-direction: column; gap: 8px; }
        .back-link {
          font-size: var(--font-aux);
          color: var(--color-primary);
          font-weight: 600;
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

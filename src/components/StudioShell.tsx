import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from './Layout';

interface Props {
  title: string;
  step: number;
  total: number;
  children: ReactNode;
}

export function StudioShell({ title, step, total, children }: Props) {
  return (
    <Layout title={title}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <Link to="/methods" className="muted" style={{ fontSize: 13 }}>
          ← 方法列表
        </Link>
        <div className="row" style={{ gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: i < step ? 'var(--color-primary)' : 'rgba(59,130,246,0.2)',
              }}
            />
          ))}
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
        练习台 · 不计正式分
      </p>
      {children}
    </Layout>
  );
}

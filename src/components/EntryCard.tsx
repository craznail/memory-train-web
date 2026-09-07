import { Link } from 'react-router-dom';

interface Props {
  to: string;
  title: string;
  subtitle: string;
  emoji: string;
}

export function EntryCard({ to, title, subtitle, emoji }: Props) {
  return (
    <Link to={to} className="card entry-card">
      <div className="entry-emoji">{emoji}</div>
      <div className="entry-body">
        <div className="entry-title">{title}</div>
        <div className="muted">{subtitle}</div>
      </div>
      <div className="entry-arrow">›</div>
      <style>{`
        .entry-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          transition: transform 0.12s ease;
        }
        .entry-card:active { transform: scale(0.98); }
        .entry-emoji {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .entry-body { flex: 1; min-width: 0; }
        .entry-title {
          font-size: var(--font-body);
          font-weight: 700;
          margin-bottom: 2px;
        }
        .entry-arrow {
          font-size: 24px;
          color: var(--color-text-secondary);
          line-height: 1;
        }
      `}</style>
    </Link>
  );
}

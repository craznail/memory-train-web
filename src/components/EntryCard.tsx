import { Link } from 'react-router-dom';

interface Props {
  to: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** Stronger primary CTA styling */
  primary?: boolean;
}

export function EntryCard({ to, title, subtitle, emoji, primary = false }: Props) {
  return (
    <Link
      to={to}
      className={`card entry-card${primary ? ' entry-card--primary' : ''}`}
    >
      <div className={`entry-emoji${primary ? ' entry-emoji--primary' : ''}`}>
        {emoji}
      </div>
      <div className="entry-body">
        <div className="entry-title">{title}</div>
        <div className={primary ? 'entry-sub-primary' : 'muted'}>{subtitle}</div>
      </div>
      <div className={`entry-arrow${primary ? ' entry-arrow--primary' : ''}`}>›</div>
      <style>{`
        .entry-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          transition: transform 0.12s ease, box-shadow 0.15s ease;
        }
        .entry-card:active { transform: scale(0.98); }
        .entry-card--primary {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
        }
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
        .entry-emoji--primary {
          background: rgba(255, 255, 255, 0.2);
        }
        .entry-body { flex: 1; min-width: 0; }
        .entry-title {
          font-size: var(--font-body);
          font-weight: 700;
          margin-bottom: 2px;
        }
        .entry-sub-primary {
          font-size: var(--font-aux);
          color: rgba(255, 255, 255, 0.85);
        }
        .entry-arrow {
          font-size: 24px;
          color: var(--color-text-secondary);
          line-height: 1;
        }
        .entry-arrow--primary {
          color: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </Link>
  );
}

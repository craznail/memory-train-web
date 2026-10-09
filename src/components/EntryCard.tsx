import { Link } from 'react-router-dom';

interface Props {
  to: string;
  title: string;
  subtitle: string;
  /** Decorative icon (SVG via <img>, SPEC §4) */
  icon: string;
}

/** Home bottom entry (练听力 / 能力报告 / 设置) — visual v2. */
export function EntryCard({ to, title, subtitle, icon }: Props) {
  return (
    <Link to={to} className="card entry-card press">
      <img src={icon} alt="" aria-hidden="true" width={30} height={30} className="entry-icon" />
      <span className="entry-body">
        <span className="entry-title">{title}</span>
        <span className="entry-sub">{subtitle}</span>
      </span>
      <style>{`
        .entry-card {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 56px;
          min-height: 44px;
          padding: 0 7px;
          min-width: 0;
        }
        .entry-icon { flex-shrink: 0; }
        .entry-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .entry-title {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
        }
        /* all three subtitles: 11px, single line, ellipsis → equal card heights */
        .entry-sub {
          display: block;
          font-size: 11px;
          line-height: 1.35;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 359px) {
          .entry-card { gap: 4px; padding: 0 5px; }
          .entry-icon { width: 24px; height: 24px; }
          .entry-title { font-size: 13px; }
        }
      `}</style>
    </Link>
  );
}

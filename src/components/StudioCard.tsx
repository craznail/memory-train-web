import { Link } from 'react-router-dom';
import imagery1x from '../assets/illustrations/studio-imagery@1x.webp';
import imagery2x from '../assets/illustrations/studio-imagery@2x.webp';
import encoding1x from '../assets/illustrations/studio-encoding@1x.webp';
import encoding2x from '../assets/illustrations/studio-encoding@2x.webp';
import association1x from '../assets/illustrations/studio-association@1x.webp';
import association2x from '../assets/illustrations/studio-association@2x.webp';
import palace1x from '../assets/illustrations/studio-palace@1x.webp';
import palace2x from '../assets/illustrations/studio-palace@2x.webp';

export type StudioKey = 'imagery' | 'encoding' | 'association' | 'palace';

export const STUDIO_ART: Record<StudioKey, { x1: string; x2: string; tint: string }> = {
  imagery: { x1: imagery1x, x2: imagery2x, tint: '#FEF6EC' },
  encoding: { x1: encoding1x, x2: encoding2x, tint: '#FBF2F6' },
  association: { x1: association1x, x2: association2x, tint: '#FEF6EA' },
  palace: { x1: palace1x, x2: palace2x, tint: '#FCF6EC' },
};

interface Props {
  studio: StudioKey;
  to: string;
  title: string;
  /** Rendered one per line */
  lines: string[];
  /** home: auto height, art 64×54, no overlap · methods: 100 tall, art 96×80 (methods.png) */
  size?: 'home' | 'methods';
}

/** 2×2 illustrated studio card (home 练习台, reused on /methods in #4). */
export function StudioCard({ studio, to, title, lines, size = 'home' }: Props) {
  const art = STUDIO_ART[studio];
  const [w, h] = size === 'methods' ? [96, 80] : [64, 54];
  return (
    <Link
      to={to}
      className={`card studio-card studio-card--${size} press`}
      style={{ background: `linear-gradient(180deg, #FFFCF8, ${art.tint})` }}
    >
      <img
        className="studio-card-art"
        src={art.x1}
        srcSet={`${art.x1} 1x, ${art.x2} 2x`}
        width={w}
        height={h}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <span className="studio-card-title serif">{title}</span>
      <span className="studio-card-sub">
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </span>
      <svg className="studio-card-chev" width="7" height="12" viewBox="0 0 7 12" aria-hidden="true">
        <path d="M1 1l5 5-5 5" fill="none" stroke="#5A3A2C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <style>{`
        .studio-card {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100px;
          padding: 11px 0 0 14px;
          min-width: 0;
        }
        .studio-card--methods { height: 100px; }
        .studio-card-art {
          position: absolute;
          right: -4px;
          bottom: 0;
          object-fit: contain;
        }
        .studio-card-title {
          position: relative;
          font-size: var(--font-studio-title);
          line-height: 1.2;
          white-space: nowrap;
        }
        .studio-card-sub {
          position: relative;
          display: flex;
          flex-direction: column;
          margin-top: 5px;
          font-size: var(--font-caption);
          line-height: 1.45;
          color: var(--color-text-secondary);
          max-width: 78%;
          /* cream halo keeps captions readable where they overlap the art (as in the reference) */
          text-shadow: 0 0 3px #FFF9F2, 0 0 3px #FFF9F2, 0 0 6px #FFF9F2;
        }
        .studio-card-sub > span { white-space: nowrap; }
        .studio-card-chev { position: absolute; left: 14px; bottom: 10px; }
        /* home: illustration ≤80×68 bottom-right; text column ≤ card − illustration − gap and ≤55% of card → no overlap.
           (% here is of the content box = card − 14px left padding) */
        .studio-card--home { height: auto; min-height: 104px; padding: 11px 0 32px 14px; }
        .studio-card--home .studio-card-title { font-size: var(--font-card-title); }
        .studio-card--home .studio-card-title,
        .studio-card--home .studio-card-sub { max-width: min(calc(55% - 6.3px), calc(100% - 76px)); }
        .studio-card--home .studio-card-sub { text-shadow: none; font-size: 11px; letter-spacing: -0.2px; }
        .studio-card--home .studio-card-sub > span { white-space: normal; word-break: keep-all; overflow-wrap: anywhere; }
        .studio-card--home .studio-card-art { right: 4px; bottom: 6px; width: 64px; height: 54px; }
        @media (max-width: 359px) {
          .studio-card--home .studio-card-title,
          .studio-card--home .studio-card-sub { max-width: min(calc(55% - 6.3px), calc(100% - 62px)); }
          .studio-card--home .studio-card-art { width: 52px; height: 44px; }
        }
        @media (max-width: 359px) {
          .studio-card--methods .studio-card-art { width: 80px; height: 66px; }
          .studio-card--methods .studio-card-sub { font-size: 11px; }
        }
      `}</style>
    </Link>
  );
}

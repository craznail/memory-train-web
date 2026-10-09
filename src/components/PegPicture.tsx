import { pegVisual, PLACED_PX, THUMB_RADIUS_PX } from '../lib/confirmedScenes';
import { SceneImage } from './SceneImage';

interface Props {
  phase: 'place' | 'recall';
  revealed: boolean;
  imageUrl: string | null;
  text: string;
  /** Sentence illustration if the image fails to load (expired 临时图). */
  fallbackUrl?: string | null;
}

/** Placed image on a route peg. Recall hides the picture until reveal. */
export function PegPicture({ phase, revealed, imageUrl, text, fallbackUrl }: Props) {
  const visual = pegVisual({ phase, revealed, imageUrl, text });

  if (visual.type === 'text-slip') return null;

  if (visual.type === 'thumb') {
    return (
      <SceneImage
        className="peg-thumb"
        testId="peg-thumb"
        src={visual.imageUrl}
        fallbackSrc={fallbackUrl}
        width={PLACED_PX}
        height={PLACED_PX}
        style={{ width: visual.size, height: visual.size, borderRadius: THUMB_RADIUS_PX }}
      />
    );
  }

  if (visual.type === 'hidden') {
    return (
      <div
        className="peg-hidden"
        data-testid="peg-hidden"
        aria-label="画面已隐藏"
        style={{
          width: PLACED_PX,
          height: PLACED_PX,
          borderRadius: THUMB_RADIUS_PX,
          border: '1.5px dashed var(--color-border-input)',
        }}
      >
        ?
      </div>
    );
  }

  return (
    <div className="peg-reveal" data-testid="peg-revealed">
      <SceneImage
        src={visual.imageUrl}
        fallbackSrc={fallbackUrl}
        className="peg-fade"
        width={PLACED_PX}
        height={PLACED_PX}
        style={{
          width: PLACED_PX,
          height: PLACED_PX,
          borderRadius: THUMB_RADIUS_PX,
          animation: `peg-fade-in ${visual.fadeMs}ms ease`,
        }}
      />
      <span className="peg-reveal-text">{visual.text}</span>
    </div>
  );
}

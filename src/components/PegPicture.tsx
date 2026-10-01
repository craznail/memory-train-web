import { pegVisual, PLACED_PX, THUMB_RADIUS_PX } from '../lib/confirmedScenes';

interface Props {
  phase: 'place' | 'recall';
  revealed: boolean;
  imageUrl: string | null;
  text: string;
}

/** Placed image on a route peg. Recall hides the picture until reveal. */
export function PegPicture({ phase, revealed, imageUrl, text }: Props) {
  const visual = pegVisual({ phase, revealed, imageUrl, text });

  if (visual.type === 'text-slip') return null;

  if (visual.type === 'thumb') {
    return (
      <img
        className="peg-thumb"
        data-testid="peg-thumb"
        src={visual.imageUrl}
        alt=""
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
          border: '1.5px dashed #94A3B8',
        }}
      >
        ?
      </div>
    );
  }

  return (
    <div className="peg-reveal" data-testid="peg-revealed">
      <img
        src={visual.imageUrl}
        alt=""
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

import { PegPicture } from './PegPicture';
import { SceneTray } from './SceneTray';
import {
  imageUrlForPeg,
  pegVisual,
  sceneIdFromDrop,
  type ConfirmedScene,
} from '../lib/confirmedScenes';
import type { DisplayScene } from '../lib/sceneImageCache';

export interface RoutePeg {
  id: string;
  slip: string;
}

interface Props {
  pegs: readonly RoutePeg[];
  scenes: readonly (ConfirmedScene | DisplayScene)[];
  placements: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPlace: (pegId: string, sceneId: string) => void;
  mode: 'place' | 'recall';
  revealed: boolean;
}

const slipStyle = {
  padding: '4px 10px',
  borderRadius: 999,
  background: 'var(--color-primary-soft)',
  fontSize: 13,
  fontWeight: 600,
} as const;

/** Existing route pegs plus the confirmed-image tray. No new page. */
export function PalaceRouteCard({
  pegs,
  scenes,
  placements,
  selectedId,
  onSelect,
  onPlace,
  mode,
  revealed,
}: Props) {
  const allowed = scenes.map((s) => s.id);

  return (
    <div className="card stack" data-testid="palace-route">
      <div style={{ fontWeight: 700 }}>{mode === 'place' ? '路线位点' : '沿路线回忆'}</div>
      <div className="stack" style={{ gap: 8 }}>
        {pegs.map((peg) => {
          const imageUrl = imageUrlForPeg(placements, peg.id, scenes);
          const scene = scenes.find((s) => s.id === placements[peg.id]);
          const text = scene?.sentence ? `${peg.slip} · ${scene.sentence}` : peg.slip;
          const visual = pegVisual({ phase: mode, revealed, imageUrl, text });
          const showSlip = visual.type === 'text-slip' || visual.type === 'thumb';
          return (
            <div
              key={peg.id}
              className="palace-peg"
              data-testid="palace-peg"
              onDragOver={(e) => {
                if (mode !== 'place') return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (mode !== 'place') return;
                e.preventDefault();
                const id = sceneIdFromDrop(e.dataTransfer, allowed);
                if (id) onPlace(peg.id, id);
              }}
              onClick={() => {
                if (mode !== 'place' || !selectedId) return;
                onPlace(peg.id, selectedId);
              }}
            >
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <PegPicture
                  phase={mode}
                  revealed={revealed}
                  imageUrl={imageUrl}
                  text={text}
                  fallbackUrl={scene && 'fallbackUrl' in scene ? scene.fallbackUrl : null}
                />
                {showSlip && <span style={slipStyle}>{peg.slip}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {mode === 'place' && (
        <SceneTray scenes={scenes} selectedId={selectedId} onSelect={onSelect} framed={false} />
      )}
    </div>
  );
}

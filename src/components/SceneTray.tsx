import {
  EMPTY_TRAY_TEXT,
  SCENE_DRAG_TYPE,
  THUMB_PX,
  THUMB_RADIUS_PX,
  TRAY_TITLE,
  type ConfirmedScene,
} from '../lib/confirmedScenes';
import { TEMPORARY_LABEL, type DisplayScene } from '../lib/sceneImageCache';
import { SceneImage } from './SceneImage';

interface Props {
  scenes: readonly (ConfirmedScene | DisplayScene)[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** When false, skip the outer card so the strip can sit inside an existing card. */
  framed?: boolean;
}

export function SceneTray({ scenes, selectedId, onSelect, framed = true }: Props) {
  const body = (
    <>
      <div style={{ fontWeight: 700 }}>{TRAY_TITLE}</div>
      {scenes.length === 0 ? (
        <p
          className="scene-tray-empty"
          data-testid="tray-empty"
          style={{ margin: 0, color: 'var(--color-text-tertiary)', fontSize: 13 }}
        >
          {EMPTY_TRAY_TEXT}
        </p>
      ) : (
        <div className="scene-tray-strip" role="listbox" aria-label={TRAY_TITLE}>
          {scenes.map((scene) => {
            const selected = selectedId === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={scene.sentence || '待放画面'}
                draggable
                data-testid="scene-thumb"
                className={selected ? 'scene-thumb selected' : 'scene-thumb'}
                style={{
                  width: THUMB_PX,
                  height: THUMB_PX,
                  borderRadius: THUMB_RADIUS_PX,
                  boxShadow: selected ? '0 0 0 2px var(--color-primary)' : 'none',
                }}
                onClick={() => onSelect(selected ? null : scene.id)}
                onDragStart={(e) => {
                  e.dataTransfer.setData(SCENE_DRAG_TYPE, scene.id);
                  e.dataTransfer.setData('text/plain', scene.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <SceneImage
                  src={scene.url}
                  fallbackSrc={'fallbackUrl' in scene ? scene.fallbackUrl : null}
                  testId="scene-thumb-img"
                />
                {'isTemporary' in scene && scene.isTemporary && (
                  <span className="scene-temp-badge" data-testid="scene-temp-badge">
                    {TEMPORARY_LABEL}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  if (!framed) return <div className="stack">{body}</div>;
  return (
    <div className="card stack" data-testid="scene-tray">
      {body}
    </div>
  );
}

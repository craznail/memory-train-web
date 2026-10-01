import {
  EMPTY_TRAY_TEXT,
  SCENE_DRAG_TYPE,
  THUMB_PX,
  THUMB_RADIUS_PX,
  TRAY_TITLE,
  type ConfirmedScene,
} from '../lib/confirmedScenes';

interface Props {
  scenes: readonly ConfirmedScene[];
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
          style={{ margin: 0, color: '#94A3B8', fontSize: 13 }}
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
                <img src={scene.url} alt="" draggable={false} />
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

import route1x from '../../assets/illustrations/palace-route@1x.webp';
import route2x from '../../assets/illustrations/palace-route@2x.webp';
import { PALACE_ROUTE_ANCHORS, PALACE_ROUTE_SIZE } from '../../assets/illustrations/palaceRouteAnchors';

/** 讲解用示意图：客厅插画 + 代码绘制的 1→5 编号和虚线。只读示意，不是交互功能。 */
export function PalaceExplainer() {
  const { width: W, height: H } = PALACE_ROUTE_SIZE;
  const pts = PALACE_ROUTE_ANCHORS.map((a) => `${(a.x / 100) * W},${(a.y / 100) * H}`).join(' ');
  return (
    <figure className="palace-explainer" data-testid="palace-explainer">
      <div className="pe-frame">
        <img src={route1x} srcSet={`${route1x} 1x, ${route2x} 2x`} width={W} height={H} alt="" aria-hidden="true" />
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <polyline points={pts} fill="none" stroke="#E2661C" strokeWidth="5" strokeDasharray="14 12" strokeLinecap="round" />
        </svg>
        {PALACE_ROUTE_ANCHORS.map((a, i) => (
          <span key={a.label} className={`pe-pin${a.x > 60 ? ' left' : ''}`} style={{ left: `${a.x}%`, top: `${a.y}%` }}>
            <span className="n">{i + 1}</span>
            <span className="tag">{a.label}</span>
          </span>
        ))}
      </div>
      <figcaption className="muted" style={{ textAlign: 'center', marginTop: 6 }}>
        示意：按 {PALACE_ROUTE_ANCHORS.map((a, i) => `${i + 1} ${a.label}`).join(' → ')} 走一圈
      </figcaption>
    </figure>
  );
}

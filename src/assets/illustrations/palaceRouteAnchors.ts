/** Marker anchors on palace-route@1x/2x.webp, as % of image width/height, in route order. */
export const PALACE_ROUTE_ANCHORS = [
  { label: '门口', x: 22.0, y: 6.2 },
  { label: '沙发', x: 68.2, y: 14.4 },
  { label: '餐桌', x: 78.6, y: 49.1 },
  { label: '冰箱', x: 77.5, y: 77.1 },
  { label: '阳台', x: 10.9, y: 84.7 },
] as const;
/** Intrinsic size of the 1x asset (2x is double). */
export const PALACE_ROUTE_SIZE = { width: 746, height: 699 } as const;

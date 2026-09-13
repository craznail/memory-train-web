import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioShell } from '../../components/StudioShell';
import {
  DEFAULT_HOME_ROUTE,
  MAX_PER_SITE,
  PALACE_POINTS,
  type PalacePoint,
  type PalaceSite,
} from '../../data/palaceStudio';

type Phase = 'route' | 'place' | 'walk' | 'done';

type Placements = Record<string, string[]>; // siteId -> pointIds

export function PalaceStudio() {
  const [phase, setPhase] = useState<Phase>('route');
  const [sites, setSites] = useState<PalaceSite[]>(() =>
    DEFAULT_HOME_ROUTE.map((s) => ({ ...s })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placements>({});
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [walkIdx, setWalkIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [guesses, setGuesses] = useState<Record<string, string[]>>({});
  const [walkScores, setWalkScores] = useState<boolean[]>([]);

  const placedIds = useMemo(
    () => new Set(Object.values(placements).flat()),
    [placements],
  );
  const pool = PALACE_POINTS.filter((p) => !placedIds.has(p.id));
  const placedCount = placedIds.size;

  const renameSite = (id: string, name: string) => {
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const placeOnSite = (siteId: string) => {
    if (!selectedPoint) return;
    const cur = placements[siteId] ?? [];
    if (cur.length >= MAX_PER_SITE) return;
    if (cur.includes(selectedPoint)) return;
    setPlacements({ ...placements, [siteId]: [...cur, selectedPoint] });
    setSelectedPoint(null);
  };

  const removeFromSite = (siteId: string, pointId: string) => {
    const cur = (placements[siteId] ?? []).filter((id) => id !== pointId);
    const next = { ...placements };
    if (cur.length) next[siteId] = cur;
    else delete next[siteId];
    setPlacements(next);
  };

  const pointsFor = (siteId: string): PalacePoint[] =>
    (placements[siteId] ?? [])
      .map((id) => PALACE_POINTS.find((p) => p.id === id))
      .filter(Boolean) as PalacePoint[];

  const startWalk = () => {
    setWalkIdx(0);
    setRevealed(false);
    setGuesses({});
    setWalkScores([]);
    setPhase('walk');
  };

  const toggleGuess = (siteId: string, pointId: string) => {
    if (revealed) return;
    const cur = guesses[siteId] ?? [];
    const next = cur.includes(pointId)
      ? cur.filter((id) => id !== pointId)
      : [...cur, pointId];
    setGuesses({ ...guesses, [siteId]: next });
  };

  const revealAndScore = () => {
    const site = sites[walkIdx];
    const truth = new Set(placements[site.id] ?? []);
    const guess = new Set(guesses[site.id] ?? []);
    const ok =
      truth.size === guess.size && [...truth].every((id) => guess.has(id));
    setWalkScores((s) => [...s, ok]);
    setRevealed(true);
  };

  const nextStation = () => {
    if (walkIdx >= sites.length - 1) {
      setPhase('done');
      return;
    }
    setWalkIdx((i) => i + 1);
    setRevealed(false);
  };

  const correctCount = walkScores.filter(Boolean).length;
  const rate = walkScores.length
    ? Math.round((correctCount / walkScores.length) * 100)
    : 0;

  const resetAll = () => {
    setPhase('route');
    setSites(DEFAULT_HOME_ROUTE.map((s) => ({ ...s })));
    setPlacements({});
    setSelectedPoint(null);
    setWalkIdx(0);
    setRevealed(false);
    setGuesses({});
    setWalkScores([]);
  };

  if (phase === 'route') {
    return (
      <StudioShell title="宫殿工作台" step={1} total={4}>
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>选一条熟悉路线 · 家</div>
          <p className="muted">可点改名，确认后进入放置</p>
          {sites.map((s) => (
            <div key={s.id} className="row" style={{ gap: 8 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 99,
                  background: 'rgba(59,130,246,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ·
              </div>
              {editingId === s.id ? (
                <input
                  autoFocus
                  value={s.name}
                  onChange={(e) => renameSite(s.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingId(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    fontSize: 16,
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, textAlign: 'left' }}
                  onClick={() => setEditingId(s.id)}
                >
                  {s.name} · 改名
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn-primary" onClick={() => setPhase('place')}>
            确认路线，开始放置
          </button>
        </div>
      </StudioShell>
    );
  }

  if (phase === 'place') {
    return (
      <StudioShell title="宫殿工作台" step={2} total={4}>
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>把要点放到位点</div>
          <p className="muted">
            先点要点，再点位点（每点最多 {MAX_PER_SITE} 个）· 已放 {placedCount}/
            {PALACE_POINTS.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sites.map((s) => {
              const pts = pointsFor(s.id);
              const full = pts.length >= MAX_PER_SITE;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => placeOnSite(s.id)}
                  className="card"
                  style={{
                    textAlign: 'left',
                    border:
                      selectedPoint && !full
                        ? '2px solid var(--color-primary)'
                        : '1px solid #E2E8F0',
                    cursor: selectedPoint && !full ? 'pointer' : 'default',
                  }}
                >
                  <div className="row" style={{ gap: 10, marginBottom: 6 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 99,
                        background: 'var(--color-primary)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {pts.length}
                    </span>
                    <strong>{s.name}</strong>
                    {full && <span className="muted">已满</span>}
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {pts.length === 0 && <span className="muted">空位点</span>}
                    {pts.map((p) => (
                      <span
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromSite(s.id, p.id);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: 'rgba(59,130,246,0.12)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {p.label}·{p.text} ×
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 700 }}>待放要点池</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {pool.length === 0 && <span className="muted">要点已全部放下</span>}
            {pool.map((p) => (
              <button
                key={p.id}
                type="button"
                className={selectedPoint === p.id ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: 14 }}
                onClick={() =>
                  setSelectedPoint((cur) => (cur === p.id ? null : p.id))
                }
              >
                {p.label} · {p.text}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={placedCount === 0}
          onClick={startWalk}
        >
          开始走一圈
        </button>
      </StudioShell>
    );
  }

  if (phase === 'walk') {
    const site = sites[walkIdx];
    const truth = pointsFor(site.id);
    const truthIds = new Set(truth.map((p) => p.id));
    const guess = guesses[site.id] ?? [];

    return (
      <StudioShell title="宫殿工作台" step={3} total={4}>
        <div className="muted" style={{ marginBottom: 8 }}>
          第 {walkIdx + 1}/{sites.length} 站
        </div>
        <div className="card stack" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 99,
              margin: '0 auto',
              background: 'rgba(59,130,246,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            📍
          </div>
          <div className="page-title" style={{ fontSize: 22 }}>
            {site.name}
          </div>
          {!revealed ? (
            <>
              <p style={{ fontWeight: 700 }}>这里放了什么？</p>
              <p className="muted">多选你记得挂在这里的要点</p>
              <div className="stack" style={{ gap: 8 }}>
                {PALACE_POINTS.map((p) => {
                  const on = guess.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={on ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => toggleGuess(site.id, p.id)}
                    >
                      {p.label} · {p.text}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn-primary" onClick={revealAndScore}>
                揭晓对照
              </button>
            </>
          ) : (
            <>
              <p
                style={{
                  fontWeight: 800,
                  color: walkScores[walkScores.length - 1]
                    ? 'var(--color-success)'
                    : 'var(--color-error)',
                }}
              >
                {walkScores[walkScores.length - 1] ? '记对了' : '差一点'}
              </p>
              <div style={{ textAlign: 'left' }}>
                <div className="muted" style={{ marginBottom: 4 }}>
                  实际放置
                </div>
                {truth.length === 0 ? (
                  <p>空位点</p>
                ) : (
                  truth.map((p) => (
                    <div key={p.id}>
                      {p.label} · {p.text}
                    </div>
                  ))
                )}
                <div className="muted" style={{ margin: '8px 0 4px' }}>
                  你的回忆
                </div>
                {guess.length === 0 ? (
                  <p>未选</p>
                ) : (
                  guess.map((id) => {
                    const p = PALACE_POINTS.find((x) => x.id === id)!;
                    const hit = truthIds.has(id);
                    return (
                      <div
                        key={id}
                        style={{
                          color: hit ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {hit ? '✓' : '×'} {p.label} · {p.text}
                      </div>
                    );
                  })
                )}
              </div>
              <button type="button" className="btn-primary" onClick={nextStation}>
                {walkIdx >= sites.length - 1 ? '看完成结果' : '下一站'}
              </button>
            </>
          )}
        </div>
      </StudioShell>
    );
  }

  return (
    <StudioShell title="宫殿工作台" step={4} total={4}>
      <div className="card stack" style={{ textAlign: 'center', padding: 24 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            borderRadius: 999,
            background: 'rgba(34,197,94,0.15)',
            color: 'var(--color-success)',
            fontWeight: 800,
          }}
        >
          宫殿热身完成
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-primary)' }}>
          {rate}%
        </div>
        <p className="muted">
          走一圈正确 {correctCount}/{walkScores.length} 站 · 不计正式分
        </p>
        <button type="button" className="btn-primary" onClick={resetAll}>
          再练一局
        </button>
        <Link to="/methods" className="btn-secondary">
          回方法列表
        </Link>
      </div>
    </StudioShell>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioShell } from '../../components/StudioShell';
import { ASSOC_DEMOS, prefabImageUrl } from '../../data/associationStudio';
import {
  DAILY_LIMIT_HINT,
  SWAP_EXHAUSTED_HINT,
  canGenerateToday,
  canSwap,
  generateAssociationScene,
  hintForReason,
  isConfigured,
  loadImageGenPrefs,
  type FallbackReason,
} from '../../lib/imageGen';

type Phase = 'demo' | 'create' | 'result' | 'compare';

function SkeletonBlock() {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="image-gen-skeleton" aria-hidden />
      <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
        画面生成中…
      </p>
    </div>
  );
}

export function AssociationStudio() {
  const demo = ASSOC_DEMOS[0];
  const [phase, setPhase] = useState<Phase>('demo');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [quotaTick, setQuotaTick] = useState(0);

  const demoUrl = prefabImageUrl(demo.imageSeed);

  void quotaTick; // refresh prefs after generations
  const prefs = loadImageGenPrefs();
  const configured = isConfigured(prefs);
  const dailyOk = canGenerateToday();
  const dailyBlocked = configured && !dailyOk;
  const limitPreviewUrl = prefabImageUrl((text.trim() || 'daily-limit').slice(0, 48));

  const runGenerate = async (nextSwapCount: number) => {
    const sentence = text.trim();
    if (sentence.length < 4) return;

    setLoading(true);
    setHint(null);

    const outcome = await generateAssociationScene({
      sentence,
      seedSuffix: String(nextSwapCount),
    });

    setLoading(false);
    setMyUrl(outcome.url);
    setSwapCount(nextSwapCount);
    setQuotaTick((n) => n + 1);

    if (outcome.kind === 'fallback') {
      setHint(hintForReason(outcome.reason as FallbackReason));
    } else {
      setHint(null);
    }
    setPhase('result');
  };

  const onGenerate = () => {
    if (dailyBlocked) return;
    void runGenerate(0);
  };

  const onSwap = () => {
    if (!canSwap(swapCount)) return;
    void runGenerate(swapCount + 1);
  };

  const onAccept = () => {
    if (!myUrl) return;
    setPhase('compare');
  };

  const resetToCreate = () => {
    setPhase('create');
    setMyUrl(null);
    setHint(null);
    setSwapCount(0);
    setQuotaTick((n) => n + 1);
  };

  return (
    <StudioShell title="生图联想" step={3} total={3}>
      {phase === 'demo' && (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>示范：好联想长什么样</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {demo.points.map((p) => (
              <span
                key={p}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(59,130,246,0.12)',
                  fontWeight: 600,
                }}
              >
                {p}
              </span>
            ))}
          </div>
          <img
            src={demoUrl}
            alt="示范画面"
            style={{ width: '100%', borderRadius: 16, display: 'block' }}
          />
          <p style={{ fontWeight: 600 }}>{demo.hook}</p>
          <button type="button" className="btn-primary" onClick={() => setPhase('create')}>
            轮到我造
          </button>
        </div>
      )}

      {phase === 'create' && (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>自造联想</div>
          <p className="muted">用同一组要点，写出你的夸张画面，再生成配图</p>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {demo.points.map((p) => (
              <span key={p} className="muted">
                {p}
              </span>
            ))}
          </div>
          <textarea
            className="assoc-sentence-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="写出你的画面钩子…"
          />
          {loading && <SkeletonBlock />}
          {!loading && dailyBlocked && (
            <img
              src={limitPreviewUrl}
              alt="示意图"
              style={{ width: '100%', borderRadius: 16, display: 'block' }}
            />
          )}
          <div className="stack" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn-primary"
              disabled={loading || dailyBlocked || text.trim().length < 4}
              onClick={onGenerate}
            >
              生成画面
            </button>
            {dailyBlocked && (
              <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
                {DAILY_LIMIT_HINT}
              </p>
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={() => setPhase('demo')}>
            回看示范
          </button>
          <Link to="/settings" className="muted" style={{ textAlign: 'center', fontSize: 13 }}>
            配置生图服务（可选）
          </Link>
        </div>
      )}

      {phase === 'result' && (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>你的画面</div>
          {loading ? (
            <SkeletonBlock />
          ) : (
            <>
              {myUrl && (
                <img
                  src={myUrl}
                  alt="生成画面"
                  style={{ width: '100%', borderRadius: 16, display: 'block' }}
                />
              )}
              {hint && (
                <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
                  {hint}
                </p>
              )}
            </>
          )}
          <div className="stack" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || !canSwap(swapCount)}
              onClick={onSwap}
            >
              换一张
            </button>
            {!canSwap(swapCount) && (
              <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
                {SWAP_EXHAUSTED_HINT}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={loading || !myUrl}
            onClick={onAccept}
          >
            就用这张
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading}
            onClick={resetToCreate}
          >
            改句子
          </button>
        </div>
      )}

      {phase === 'compare' && myUrl && (
        <div className="card stack">
          <div style={{ fontWeight: 700 }}>对比（不计分）</div>
          <div>
            <div className="muted" style={{ marginBottom: 4 }}>
              示范图
            </div>
            <img src={demoUrl} alt="示范" style={{ width: '100%', borderRadius: 12 }} />
          </div>
          <div>
            <div className="muted" style={{ marginBottom: 4 }}>
              我的图
            </div>
            <img src={myUrl} alt="我的" style={{ width: '100%', borderRadius: 16 }} />
          </div>
          <p className="muted">你的钩子：{text}</p>
          <Link to="/methods" className="btn-primary">
            完成，回方法列表
          </Link>
          <button type="button" className="btn-secondary" onClick={resetToCreate}>
            再造一版
          </button>
        </div>
      )}
    </StudioShell>
  );
}

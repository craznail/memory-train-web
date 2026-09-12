import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioShell } from '../../components/StudioShell';
import {
  ASSOC_DEMOS,
  generateAssociationImage,
  prefabImageUrl,
} from '../../data/associationStudio';

type Phase = 'demo' | 'create' | 'compare';

export function AssociationStudio() {
  const demo = ASSOC_DEMOS[0];
  const [phase, setPhase] = useState<Phase>('demo');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const demoUrl = prefabImageUrl(demo.imageSeed);

  const onGenerate = async () => {
    setLoading(true);
    setFailed(false);
    const res = await generateAssociationImage(text);
    setLoading(false);
    if (!res.ok) {
      setFailed(true);
      setMyUrl(null);
      return;
    }
    setMyUrl(res.url);
    setPhase('compare');
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="写出你的画面钩子…"
            style={{
              width: '100%',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              padding: 12,
              fontSize: 16,
              fontFamily: 'inherit',
            }}
          />
          {loading && (
            <div
              className="card"
              style={{
                height: 180,
                background: 'linear-gradient(90deg,#E2E8F0,#F8FAFC,#E2E8F0)',
                backgroundSize: '200% 100%',
                borderRadius: 16,
              }}
            />
          )}
          {failed && (
            <div className="card">
              <p style={{ fontWeight: 700 }}>配图暂时失败</p>
              <p className="muted">先记住文字钩子，不堵流程。可重试生成。</p>
            </div>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={loading || text.trim().length < 4}
            onClick={onGenerate}
          >
            {loading ? '生成中…' : '生成我的画面'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setPhase('demo')}>
            回看示范
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
            <img src={myUrl} alt="我的" style={{ width: '100%', borderRadius: 12 }} />
          </div>
          <p className="muted">你的钩子：{text}</p>
          <Link to="/methods" className="btn-primary">
            完成，回方法列表
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setPhase('create');
              setMyUrl(null);
            }}
          >
            再造一版
          </button>
        </div>
      )}
    </StudioShell>
  );
}

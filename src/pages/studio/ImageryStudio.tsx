import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioShell } from '../../components/StudioShell';
import { IMAGERY_ROUNDS, scoreImageryText } from '../../data/imageryGym';

const PASS_NEED = 3;

type Phase = 'cover' | 'play' | 'done';

export function ImageryStudio() {
  const rounds = useMemo(() => IMAGERY_ROUNDS, []);
  const [phase, setPhase] = useState<Phase>('cover');
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ReturnType<typeof scoreImageryText> | null>(null);

  const round = rounds[idx % rounds.length];

  const submit = () => {
    const content =
      picked !== null ? round.options[picked] : text;
    const fb = scoreImageryText(content);
    // Selecting the best exaggerated option always counts as pass
    if (picked === round.bestOption) {
      fb.concrete = true;
      fb.exaggerated = true;
      fb.action = true;
      fb.pass = true;
    }
    setFeedback(fb);
    if (fb.pass) {
      const next = streak + 1;
      setStreak(next);
      if (next >= PASS_NEED) {
        setTimeout(() => setPhase('done'), 600);
      }
    } else {
      setStreak(0);
    }
  };

  const nextRound = () => {
    setIdx((i) => i + 1);
    setText('');
    setPicked(null);
    setFeedback(null);
  };

  if (phase === 'cover') {
    return (
      <StudioShell title="成像健身房" step={1} total={3}>
        <div className="card stack" style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 40 }}>🏋️</div>
          <div className="page-title" style={{ fontSize: 22 }}>今日关卡：两词挂钩</div>
          <p className="muted">把两个词逼出夸张画面。连续 {PASS_NEED} 题达标过关。</p>
          <button type="button" className="btn-primary" onClick={() => setPhase('play')}>
            开始热身
          </button>
        </div>
      </StudioShell>
    );
  }

  if (phase === 'done') {
    return (
      <StudioShell title="成像健身房" step={3} total={3}>
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
            成像热身完成
          </div>
          <p className="muted">脑中会出画面了，再去编码码表或联想工作室会更顺。</p>
          <Link to="/studio/encoding" className="btn-primary">
            下一刀：编码码表
          </Link>
          <Link to="/methods" className="btn-secondary">
            回方法列表
          </Link>
        </div>
      </StudioShell>
    );
  }

  return (
    <StudioShell title="成像健身房" step={2} total={3}>
      <div className="muted" style={{ marginBottom: 8 }}>
        连胜 {streak}/{PASS_NEED}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 20 }}>
          {round.left}
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 20 }}>
          {round.right}
        </div>
      </div>
      <div className="card stack">
        <div style={{ fontWeight: 700 }}>造画面</div>
        <p className="muted">选一个夸张选项，或自己写一句</p>
        {round.options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            className={picked === i ? 'btn-primary' : 'btn-secondary'}
            style={{ textAlign: 'left' }}
            onClick={() => {
              setPicked(i);
              setText('');
              setFeedback(null);
            }}
          >
            {opt}
          </button>
        ))}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPicked(null);
            setFeedback(null);
          }}
          placeholder="或自己写：越具体、越夸张、越有动作越好"
          rows={3}
          style={{
            width: '100%',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            padding: 12,
            fontSize: 16,
            fontFamily: 'inherit',
          }}
        />
        {!feedback && (
          <button
            type="button"
            className="btn-primary"
            disabled={picked === null && text.trim().length < 4}
            onClick={submit}
          >
            提交画面
          </button>
        )}
        {feedback && (
          <>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className={feedback.concrete ? 'success-text' : 'error-text'}>
                {feedback.concrete ? '✓ 具体' : '× 再具体点'}
              </span>
              <span className={feedback.exaggerated ? 'success-text' : 'error-text'}>
                {feedback.exaggerated ? '✓ 夸张' : '× 再夸张'}
              </span>
              <span className={feedback.action ? 'success-text' : 'error-text'}>
                {feedback.action ? '✓ 有动作' : '× 加点动作'}
              </span>
            </div>
            <p style={{ fontWeight: 700, color: feedback.pass ? 'var(--color-success)' : 'var(--color-error)' }}>
              {feedback.pass ? '过关！画面够劲。' : '还差点，试试更荒诞的动作。'}
            </p>
            <button type="button" className="btn-primary" onClick={nextRound}>
              下一组词
            </button>
          </>
        )}
      </div>
    </StudioShell>
  );
}

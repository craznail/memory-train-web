import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudioShell } from '../../components/StudioShell';
import { CODE_TABLE_0_9, type DrillMode } from '../../data/codeTable';

export function EncodingStudio() {
  const [mode, setMode] = useState<DrillMode>('digitToImage');
  const [showTable, setShowTable] = useState(false);
  const [qi, setQi] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const queue = useMemo(() => {
    return [...CODE_TABLE_0_9].sort(() => Math.random() - 0.5);
  }, [mode]);

  const current = queue[qi % queue.length];
  const choices = useMemo(() => {
    const pool = [...CODE_TABLE_0_9].sort(() => Math.random() - 0.5);
    const correctOne = current;
    const others = pool.filter((p) => p.digit !== correctOne.digit).slice(0, 3);
    return [...others, correctOne].sort(() => Math.random() - 0.5);
  }, [current, qi]);

  const onPick = (digit: string) => {
    if (flash) return;
    setPicked(digit);
    const ok = digit === current.digit;
    setFlash(ok ? 'ok' : 'bad');
    setAnswered((n) => n + 1);
    if (ok) setCorrect((n) => n + 1);
    setTimeout(() => {
      setFlash(null);
      setPicked(null);
      setQi((n) => n + 1);
    }, 700);
  };

  const rate = answered ? Math.round((correct / answered) * 100) : 0;

  return (
    <StudioShell title="编码码表" step={2} total={3}>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className={mode === 'digitToImage' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => {
            setMode('digitToImage');
            setQi(0);
            setCorrect(0);
            setAnswered(0);
          }}
        >
          数字→意象
        </button>
        <button
          type="button"
          className={mode === 'imageToDigit' ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1 }}
          onClick={() => {
            setMode('imageToDigit');
            setQi(0);
            setCorrect(0);
            setAnswered(0);
          }}
        >
          意象→数字
        </button>
      </div>

      <button type="button" className="btn-secondary" onClick={() => setShowTable((v) => !v)}>
        {showTable ? '收起码表' : '翻表查阅'}
      </button>

      {showTable && (
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {CODE_TABLE_0_9.map((e) => (
            <div
              key={e.digit}
              style={{
                textAlign: 'center',
                padding: 8,
                borderRadius: 12,
                background: 'rgba(59,130,246,0.08)',
              }}
            >
              <div style={{ fontSize: 22 }}>{e.emoji}</div>
              <div style={{ fontWeight: 800 }}>{e.digit}</div>
              <div className="muted" style={{ fontSize: 12 }}>{e.word}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card stack" style={{ textAlign: 'center' }}>
        <div className="muted">本轮练习</div>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.2 }}>
          {mode === 'digitToImage' ? current.digit : current.emoji + ' ' + current.word}
        </div>
        <p className="muted">
          {mode === 'digitToImage' ? '选对应意象' : '选对应数字'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {choices.map((c) => {
            const label = mode === 'digitToImage' ? c.emoji + ' ' + c.word : c.digit;
            const active = picked === c.digit;
            return (
              <button
                key={c.digit + label}
                type="button"
                className={active ? 'btn-primary' : 'btn-secondary'}
                style={{
                  minHeight: 56,
                  outline:
                    flash && active
                      ? flash === 'ok'
                        ? '2px solid var(--color-success)'
                        : '2px solid var(--color-error)'
                      : undefined,
                }}
                onClick={() => onPick(c.digit)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="muted">通关条：正确率 {answered ? rate + '%' : '—'}（{correct}/{answered}）</div>
      </div>

      <Link to="/studio/association" className="btn-primary">
        下一刀：生图联想
      </Link>
      <Link to="/methods" className="btn-secondary">
        回方法列表
      </Link>
    </StudioShell>
  );
}

interface Props {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export function InterferenceCard({ prompt, value, onChange, onSubmit }: Props) {
  return (
    <div className="card stack">
      <div className="page-title" style={{ fontSize: 18 }}>抗干扰题</div>
      <p className="muted">听完后先完成一道简单心算，再回忆刚才的内容。</p>
      <p style={{ fontWeight: 600, fontSize: 18 }}>{prompt}</p>
      <input
        className="input-field"
        type="number"
        inputMode="numeric"
        placeholder="输入答案"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onSubmit();
        }}
      />
      <button
        type="button"
        className="btn-primary"
        disabled={!value.trim()}
        onClick={onSubmit}
      >
        提交并开始答题
      </button>
    </div>
  );
}

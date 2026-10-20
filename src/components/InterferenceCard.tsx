import hero1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import hero2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';

interface Props {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

/** 「请心算：4 + 7 = ?」 → 「4 + 7 = ?」 */
export function equationOf(prompt: string): string {
  return prompt.replace(/^[^：:]*[：:]\s*/, '').trim();
}

/** v2 心算干扰卡（小插曲）. */
export function InterferenceCard({ prompt, value, onChange, onSubmit }: Props) {
  return (
    <div className="stack" style={{ gap: 14 }} data-testid="interference">
      <span className="v2-pill intf-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17V5l10-2v12" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" /><circle cx="6.5" cy="17" r="2.6" fill="var(--color-primary)" /><circle cx="16.5" cy="15" r="2.6" fill="var(--color-primary)" /></svg>
        小插曲
      </span>
      <div className="card intf-card">
        <img className="intf-img" src={hero1x} srcSet={`${hero1x} 1x, ${hero2x} 2x`} alt="" aria-hidden="true" />
        <div className="intf-body">
          <p className="intf-eq" id="intf-eq">{equationOf(prompt)}</p>
          <input
            className="intf-input"
            type="number"
            inputMode="numeric"
            placeholder="输入答案"
            aria-labelledby="intf-eq"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) onSubmit();
            }}
          />
        </div>
      </div>
      <button type="button" className="btn-gradient btn-cta press" disabled={!value.trim()} onClick={onSubmit}>
        提交
      </button>
    </div>
  );
}

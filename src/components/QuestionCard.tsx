import type { Question } from '../types';

interface Props {
  question: Question;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  showFeedback?: boolean;
  isCorrect?: boolean;
}

export function QuestionCard({
  question,
  index,
  total,
  value,
  onChange,
  onNext,
  showFeedback,
  isCorrect,
}: Props) {
  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">
          第 {index + 1} / {total} 题
        </span>
        <span className="muted">{question.category}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 17 }}>{question.prompt}</div>

      {question.choices ? (
        <div className="stack" style={{ gap: 8 }}>
          {question.choices.map((c) => {
            let cls = 'option-btn';
            if (value === c) cls += ' selected';
            if (showFeedback) {
              if (c === question.answer) cls += ' correct';
              else if (value === c && !isCorrect) cls += ' wrong';
            }
            return (
              <button
                key={c}
                type="button"
                className={cls}
                disabled={showFeedback}
                onClick={() => onChange(c)}
              >
                {c}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          className="input-field"
          value={value}
          disabled={showFeedback}
          placeholder="输入你的回答"
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {showFeedback && (
        <div className={isCorrect ? 'success-text' : 'error-text'} style={{ fontWeight: 600 }}>
          {isCorrect ? '回答正确' : `不正确，参考答案：${question.answer}`}
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        disabled={!value.trim() && !showFeedback}
        onClick={onNext}
      >
        {index >= total - 1 ? '完成本轮' : '下一题'}
      </button>
    </div>
  );
}

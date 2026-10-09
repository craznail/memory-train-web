import type { Question } from '../types';
import correct1x from '../assets/illustrations/elephant-correct@1x.webp';
import correct2x from '../assets/illustrations/elephant-correct@2x.webp';
import wrong1x from '../assets/illustrations/elephant-wrong@1x.webp';
import wrong2x from '../assets/illustrations/elephant-wrong@2x.webp';

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
        <div
          className={`feedback ${isCorrect ? 'feedback--ok success-text' : 'feedback--bad error-text'}`}
          role="status"
        >
          <img
            src={isCorrect ? correct1x : wrong1x}
            srcSet={isCorrect ? `${correct1x} 1x, ${correct2x} 2x` : `${wrong1x} 1x, ${wrong2x} 2x`}
            width={64}
            height={64}
            alt=""
            aria-hidden="true"
          />
          <span className="feedback-text">
            {isCorrect ? '回答正确' : `不正确，参考答案：${question.answer}`}
          </span>
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

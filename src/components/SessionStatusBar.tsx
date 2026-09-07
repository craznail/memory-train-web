import type { SessionPhase } from '../types';

const STEPS = ['播放中', '抗干扰', '答题中', '本轮反馈'] as const;

interface Props {
  phase: SessionPhase;
  withInterference: boolean;
  /** Per-question feedback within answering */
  showFeedback?: boolean;
}

function resolveStepIndex(
  phase: SessionPhase,
  showFeedback: boolean,
): number {
  if (phase === 'interference') return 1;
  if (phase === 'feedback' || phase === 'result') return 3;
  if (phase === 'answering') return showFeedback ? 3 : 2;
  // ready / playing / played / idle
  return 0;
}

export function SessionStatusBar({
  phase,
  withInterference,
  showFeedback = false,
}: Props) {
  const current = resolveStepIndex(phase, showFeedback);

  return (
    <nav className="session-status-bar" aria-label="流程进度">
      {STEPS.map((label, i) => {
        const skipped = label === '抗干扰' && !withInterference;
        const active = !skipped && i === current;
        const done = !skipped && i < current;
        const cls = [
          'session-step',
          active ? 'active' : '',
          done ? 'done' : '',
          skipped ? 'skipped' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={label} className={cls}>
            <span className="session-step-label">{label}</span>
          </div>
        );
      })}
    </nav>
  );
}

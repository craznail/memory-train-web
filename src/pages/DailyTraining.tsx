import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayOnceBar } from '../components/PlayOnceBar';
import { InterferenceCard } from '../components/InterferenceCard';
import { QuestionCard } from '../components/QuestionCard';
import { SessionStatusBar } from '../components/SessionStatusBar';
import { getPaperById } from '../data/papers';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, summarizePractice, isAnswerCorrect } from '../lib/scoring';
import {
  loadOrCreateDailyPlan,
  markRoundDone,
  resetDailyPlanForRetry,
  type DailyPlan,
} from '../lib/dailyTraining';

function RoundSession({
  plan,
  roundIndex,
  onRoundComplete,
}: {
  plan: DailyPlan;
  roundIndex: number;
  onRoundComplete: (next: DailyPlan) => void;
}) {
  const round = plan.rounds[roundIndex];
  const paper = useMemo(() => {
    const p = getPaperById(round.paperId);
    if (!p) throw new Error(`missing paper ${round.paperId}`);
    return p;
  }, [round.paperId]);

  const session = useListenSession({
    paper,
    mode: 'practice',
    enableInterference: round.withInterference,
  });
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [roundFeedback, setRoundFeedback] = useState<string | null>(null);

  const q = paper.questions[session.currentQ];
  const value = session.answers[q?.id] ?? '';

  const finishRound = () => {
    const records = gradeAnswers(paper, session.answers);
    const summary = summarizePractice(records);
    setRoundFeedback(`本轮 ${summary.correct}/${summary.total} 正确（不计分）`);
    const next = markRoundDone(plan, roundIndex);
    // brief pause then parent advances
    setTimeout(() => onRoundComplete(next), 800);
  };

  const onNext = () => {
    if (!feedbackMode) {
      setFeedbackMode(true);
      return;
    }
    setFeedbackMode(false);
    if (session.currentQ >= paper.questions.length - 1) {
      finishRound();
    } else {
      session.nextQuestion();
    }
  };

  return (
    <>
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="muted">
          今日训练 · 第 {roundIndex + 1}/3 轮
          {round.withInterference ? ' · 含抗干扰' : ''}
        </div>
        <div style={{ fontWeight: 700 }}>{paper.title}</div>
        <div className="muted" style={{ marginTop: 4 }}>
          不写入正式 Memory Score
        </div>
      </div>

      <SessionStatusBar
        phase={session.phase}
        withInterference={session.withInterference}
        showFeedback={feedbackMode}
      />

      {(session.phase === 'ready' || session.phase === 'playing') && (
        <PlayOnceBar
          playStatus={session.playStatus}
          phase={session.phase}
          playedOnce={session.playedOnce}
          onPlay={() => session.startPlay(false)}
        />
      )}

      {session.phase === 'interference' && paper.interference && (
        <InterferenceCard
          prompt={paper.interference.prompt}
          value={session.interferenceInput}
          onChange={session.setInterferenceInput}
          onSubmit={session.submitInterference}
        />
      )}

      {session.phase === 'answering' && q && (
        <QuestionCard
          question={q}
          index={session.currentQ}
          total={paper.questions.length}
          value={value}
          onChange={(v) => session.setAnswer(q.id, v)}
          showFeedback={feedbackMode}
          isCorrect={isAnswerCorrect(value, q.answer)}
          onNext={onNext}
        />
      )}

      {roundFeedback && (
        <div className="card" style={{ textAlign: 'center' }}>
          {roundFeedback}
        </div>
      )}
    </>
  );
}

export function DailyTraining() {
  const [plan, setPlan] = useState<DailyPlan>(() => loadOrCreateDailyPlan());
  const [sessionKey, setSessionKey] = useState(0);

  const doneCount = plan.rounds.filter((r) => r.done).length;
  const activeIndex = plan.completed
    ? -1
    : plan.rounds.findIndex((r) => !r.done);

  const onRoundComplete = (next: DailyPlan) => {
    setPlan(next);
    setSessionKey((k) => k + 1);
  };

  const onRetry = () => {
    const next = resetDailyPlanForRetry(plan);
    setPlan(next);
    setSessionKey((k) => k + 1);
  };

  return (
    <Layout title="今日训练">
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 700 }}>进度 {doneCount}/3</div>
        <div className="muted" style={{ marginTop: 4 }}>
          {plan.date} · 约 10～15 分钟 · 不改正式分
        </div>
        <div
          style={{
            marginTop: 10,
            height: 8,
            borderRadius: 999,
            background: 'rgba(59,130,246,0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(doneCount / 3) * 100}%`,
              height: '100%',
              background: 'var(--color-primary)',
            }}
          />
        </div>
      </div>

      {plan.completed || activeIndex < 0 ? (
        <div className="card stack">
          <div className="page-title" style={{ fontSize: 18 }}>
            今日训练已完成
          </div>
          <p className="muted">正式 Memory Score 未改动。可以重练巩固，或回首页。</p>
          <button type="button" className="btn-primary" onClick={onRetry}>
            再练一遍（仍不计分）
          </button>
          <Link to="/" className="btn-secondary">
            返回首页
          </Link>
        </div>
      ) : (
        <RoundSession
          key={`${plan.date}-${activeIndex}-${sessionKey}`}
          plan={plan}
          roundIndex={activeIndex}
          onRoundComplete={onRoundComplete}
        />
      )}
    </Layout>
  );
}

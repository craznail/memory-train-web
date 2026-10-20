import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayCard } from '../components/v2/V2';
import land1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import land2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';
import { InterferenceCard } from '../components/InterferenceCard';
import { QuestionCard } from '../components/QuestionCard';
import { SessionStatusBar } from '../components/SessionStatusBar';
import { CoachBar } from '../components/CoachBar';
import { CoachReviewCard } from '../components/CoachReviewCard';
import { pickPaper, LEVEL_LABEL } from '../data/papers';
import type { PaperLevel } from '../types';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, summarizePractice, isAnswerCorrect } from '../lib/scoring';

const LEVELS: PaperLevel[] = ['easy', 'medium', 'hard'];

export function PracticeSession() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('level') as PaperLevel | null;
  const level: PaperLevel = raw && LEVELS.includes(raw) ? raw : 'medium';
  const paperId = params.get('paper') ?? undefined;
  return (
    <PracticeRun
      key={`${level}:${paperId ?? ''}`}
      level={level}
      paperId={paperId}
      onLevel={(l) => setParams({ level: l }, { replace: true })}
    />
  );
}

function PracticeRun({
  level,
  paperId,
  onLevel,
}: {
  level: PaperLevel;
  paperId?: string;
  onLevel: (l: PaperLevel) => void;
}) {
  const navigate = useNavigate();
  const paper = useMemo(() => pickPaper(paperId, level), [paperId, level]);
  const session = useListenSession({ paper, mode: 'practice', enableInterference: true });
  const [feedbackMode, setFeedbackMode] = useState(false);

  /** Difficulty is chosen before listening; locked (grey) once playback starts. */
  const locked = session.phase !== 'ready';
  const showPlayCard =
    session.phase === 'ready' || session.phase === 'playing' || session.phase === 'answering';

  const q = paper.questions[session.currentQ];
  const value = session.answers[q?.id] ?? '';

  const finish = () => {
    const records = gradeAnswers(paper, session.answers);
    const summary = summarizePractice(records);
    navigate('/practice/end', {
      state: { summary, paperId: paper.id, records },
      replace: true,
    });
  };

  const onNext = () => {
    if (!feedbackMode) {
      setFeedbackMode(true);
      return;
    }
    setFeedbackMode(false);
    if (session.currentQ >= paper.questions.length - 1) {
      finish();
    } else {
      session.nextQuestion();
    }
  };

  return (
    <Layout title="练听力">
      <SessionStatusBar
        phase={session.phase}
        withInterference={session.withInterference}
        showFeedback={feedbackMode}
      />

      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="muted">练习材料（不计分） · {LEVEL_LABEL[paper.level]}</div>
        <div style={{ fontWeight: 700 }}>{paper.title}</div>
      </div>

      <div
        className={locked ? 'level-switch is-locked' : 'level-switch'}
        role="radiogroup"
        aria-label="难度"
        data-testid="level-switch"
      >
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={l === paper.level}
            className={l === paper.level ? 'level-seg is-active' : 'level-seg'}
            disabled={locked}
            onClick={() => onLevel(l)}
          >
            {LEVEL_LABEL[l]}
          </button>
        ))}
      </div>

      {showPlayCard && (
        <PlayCard
          phase={session.phase === 'playing' ? 'playing' : session.phase}
          playedOnce={session.playedOnce}
          playStatus={session.playStatus}
          onPlay={() => session.startPlay(false)}
          onReplay={session.listenAgain}
          replaying={session.listeningAgain}
          img1x={land1x}
          img2x={land2x}
        />
      )}

      {(session.phase === 'ready' || session.phase === 'playing') && (
        <CoachBar
          visible={session.coachAllowed}
          enabled={session.coachEnabled}
          tip={session.phase === 'playing' ? session.coachTip : null}
          onToggle={session.setCoachEnabled}
        />
      )}

      {session.phase === 'coach_review' && (
        <CoachReviewCard
          tips={session.coachShownTips}
          onContinue={session.finishCoachReview}
          onSkip={session.finishCoachReview}
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
    </Layout>
  );
}

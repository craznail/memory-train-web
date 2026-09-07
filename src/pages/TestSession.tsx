import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayOnceBar } from '../components/PlayOnceBar';
import { InterferenceCard } from '../components/InterferenceCard';
import { QuestionCard } from '../components/QuestionCard';
import { SessionStatusBar } from '../components/SessionStatusBar';
import { PAPERS, pickPaperByIndex } from '../data/papers';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, computeTestScore, isAnswerCorrect } from '../lib/scoring';
import { saveScore } from '../lib/storage';

export function TestSession() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paperIndex = Number(params.get('p') ?? '0') || 0;
  const paper = useMemo(() => pickPaperByIndex(paperIndex), [paperIndex]);

  const session = useListenSession({ paper, mode: 'test' });
  const [showFb, setShowFb] = useState(false);

  const q = paper.questions[session.currentQ];
  const value = q ? session.answers[q.id] ?? '' : '';

  const commitAndGoResult = () => {
    const records = gradeAnswers(paper, session.answers);
    const score = computeTestScore(paper, records, session.interferenceCorrect);
    saveScore(score);
    navigate('/test/result', {
      state: { score, records, paperId: paper.id },
      replace: true,
    });
  };

  const onQuestionNext = () => {
    if (!showFb) {
      setShowFb(true);
      return;
    }
    setShowFb(false);
    if (session.currentQ >= paper.questions.length - 1) {
      commitAndGoResult();
    } else {
      session.setCurrentQ(session.currentQ + 1);
    }
  };

  return (
    <Layout title="测听力">
      <SessionStatusBar
        phase={session.phase}
        withInterference={session.withInterference}
        showFeedback={showFb}
      />

      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="muted">本次试卷</div>
        <div style={{ fontWeight: 700 }}>{paper.title}</div>
        <div className="row" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
          {PAPERS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={
                i === paperIndex % PAPERS.length ? 'btn-primary' : 'btn-secondary'
              }
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
              disabled={session.phase !== 'ready'}
              onClick={() => navigate(`/test?p=${i}`, { replace: true })}
            >
              {String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      </div>

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
          showFeedback={showFb}
          isCorrect={isAnswerCorrect(value, q.answer)}
          onNext={onQuestionNext}
        />
      )}
    </Layout>
  );
}

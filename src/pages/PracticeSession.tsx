import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayOnceBar } from '../components/PlayOnceBar';
import { InterferenceCard } from '../components/InterferenceCard';
import { QuestionCard } from '../components/QuestionCard';
import { pickPaper } from '../data/papers';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, summarizePractice, isAnswerCorrect } from '../lib/scoring';

export function PracticeSession() {
  const navigate = useNavigate();
  const paper = useMemo(() => pickPaper(), []);
  const session = useListenSession({ paper, mode: 'practice', enableInterference: true });
  const [feedbackMode, setFeedbackMode] = useState(false);

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
      <div className="card" style={{ padding: '12px 16px' }}>
        <div className="muted">练习材料（不计分）</div>
        <div style={{ fontWeight: 700 }}>{paper.title}</div>
      </div>

      {(session.phase === 'ready' || session.phase === 'playing') && (
        <PlayOnceBar
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
    </Layout>
  );
}

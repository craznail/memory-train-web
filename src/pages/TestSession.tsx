import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayCard, ProgressBar, ChoiceList, Chevron } from '../components/v2/V2';
import land1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import land2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';
import { InterferenceCard } from '../components/InterferenceCard';
import { SessionStatusBar } from '../components/SessionStatusBar';
import { CoachBar } from '../components/CoachBar';
import { CoachReviewCard } from '../components/CoachReviewCard';
import { PAPERS, pickPaperByIndex } from '../data/papers';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, computeTestScore } from '../lib/scoring';
import { saveScore } from '../lib/storage';

export function TestSession() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paperIndex = Number(params.get('p') ?? '0') || 0;
  const paper = useMemo(() => pickPaperByIndex(paperIndex), [paperIndex]);

  const session = useListenSession({ paper, mode: 'test' });

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

  // 正式测试中不提示对错：选完直接下一题，结果页再统一看。
  const onQuestionNext = () => {
    if (session.currentQ >= paper.questions.length - 1) {
      commitAndGoResult();
    } else {
      session.setCurrentQ(session.currentQ + 1);
    }
  };

  return (
    <Layout title="测听力">
      {session.phase !== 'answering' && (
        <>
      <SessionStatusBar
        phase={session.phase}
        withInterference={session.withInterference}
        showFeedback={false}
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

        </>
      )}

      {(session.phase === 'ready' || session.phase === 'playing') && (
        <>
          <PlayCard
            playStatus={session.playStatus}
            phase={session.phase}
            playedOnce={session.playedOnce}
            onPlay={() => session.startPlay(false)}
            img1x={land1x}
            img2x={land2x}
          />
          <CoachBar
            visible={session.coachAllowed}
            enabled={session.coachEnabled}
            tip={session.phase === 'playing' ? session.coachTip : null}
            onToggle={session.setCoachEnabled}
          />
        </>
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
        <>
          <ProgressBar index={session.currentQ} total={paper.questions.length} />
          <PlayCard phase="answering" playedOnce playStatus={session.playStatus} onPlay={() => {}} img1x={land1x} img2x={land2x} />
          <div className="v2-q-title">{q.prompt}</div>
          {q.choices ? (
            <ChoiceList question={q} value={value} onChange={(v) => session.setAnswer(q.id, v)} />
          ) : (
            <input className="input-field" value={value} placeholder="输入你的回答" aria-label={q.prompt} onChange={(e) => session.setAnswer(q.id, e.target.value)} />
          )}
          <button type="button" className="btn-gradient btn-cta press" disabled={!value.trim()} onClick={onQuestionNext}>
            {session.currentQ >= paper.questions.length - 1 ? '完成测试' : '下一题'}
            <Chevron />
          </button>
        </>
      )}
    </Layout>
  );
}

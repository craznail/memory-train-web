import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayOnceBar } from '../components/PlayOnceBar';
import { QuestionCard } from '../components/QuestionCard';
import { GroupingHintPanel } from '../components/GroupingHintPanel';
import { MethodHintPanel } from '../components/MethodHintPanel';
import { pickPaperByIndex } from '../data/papers';
import { getMethod } from '../data/methods';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, summarizePractice, isAnswerCorrect } from '../lib/scoring';
import type { PracticeSummary } from '../types';

const STEPS = ['盲听', '讲解', '带提示再听', '对比'] as const;

export function TeachSession() {
  const { methodId = 'chunking' } = useParams();
  const method = getMethod(methodId);

  const paper = useMemo(() => {
    const idx = methodId === 'association' || methodId === 'imagery' ? 1 : methodId === 'story' || methodId === 'encoding' || methodId === 'palace' ? 2 : 0;
    return pickPaperByIndex(idx);
  }, [methodId]);
  const session = useListenSession({
    paper,
    mode: 'teach',
    enableInterference: false,
  });

  const [blindSummary, setBlindSummary] = useState<PracticeSummary | null>(null);
  const [afterSummary, setAfterSummary] = useState<PracticeSummary | null>(null);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [answeringPass, setAnsweringPass] = useState<'blind' | 'after'>('blind');

  if (!method || method.status !== 'ready') {
    return <Navigate to="/methods" replace />;
  }

  const stepIndex =
    session.phase === 'ready' ||
    session.phase === 'playing' ||
    (session.phase === 'answering' && answeringPass === 'blind') ||
    session.phase === 'played'
      ? 0
      : session.phase === 'explain'
        ? 1
        : session.phase === 'replay_ready' ||
            session.phase === 'replaying' ||
            (session.phase === 'answering' && answeringPass === 'after')
          ? 2
          : 3;

  const q = paper.questions[session.currentQ];
  const value = session.answers[q?.id] ?? '';

  const finishAnswering = () => {
    const records = gradeAnswers(paper, session.answers);
    const summary = summarizePractice(records);
    if (answeringPass === 'blind') {
      setBlindSummary(summary);
      session.recordBlindHint(Math.round((summary.correct / summary.total) * 100));
      session.goExplain();
    } else {
      setAfterSummary(summary);
      session.goCompare();
    }
    setFeedbackMode(false);
  };

  const onQuestionNext = () => {
    if (!feedbackMode) {
      setFeedbackMode(true);
      return;
    }
    setFeedbackMode(false);
    if (session.currentQ >= paper.questions.length - 1) {
      finishAnswering();
    } else {
      session.nextQuestion();
    }
  };

  const isChunking = method.id === 'chunking';

  return (
    <Layout title={method.title}>
      <div className="step-dots" aria-label="学习步骤">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`step-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
            title={s}
          />
        ))}
      </div>
      <p className="muted" style={{ textAlign: 'center' }}>
        步骤 {stepIndex + 1}/4 · {STEPS[stepIndex]}（不计分）
      </p>

      {(session.phase === 'ready' || session.phase === 'playing') && (
        <>
          <div className="card">
            <p style={{ fontWeight: 600 }}>第一步：盲听</p>
            <p className="muted" style={{ marginTop: 6 }}>
              先不看任何提示，听一遍材料，然后回答具体问题。
            </p>
          </div>
          <PlayOnceBar
            playStatus={session.playStatus}
            phase={session.phase}
            playedOnce={session.playedOnce}
            onPlay={() => {
              setAnsweringPass('blind');
              session.startPlay(false);
            }}
            hint="盲听阶段不会显示方法提示"
          />
        </>
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
          onNext={onQuestionNext}
        />
      )}

      {session.phase === 'explain' && (
        <div className="card stack">
          <div className="page-title" style={{ fontSize: 18 }}>
            {method.title}
          </div>
          {method.explain.map((p) => (
            <p key={p.slice(0, 12)}>{p}</p>
          ))}
          {method.example && <p className="muted">{method.example}</p>}
          {blindSummary && (
            <p>
              你盲听正确 {blindSummary.correct}/{blindSummary.total} 题
              {session.blindScoreHint !== null ? `（约 ${session.blindScoreHint} 分）` : ''}。
            </p>
          )}
          {isChunking ? (
            <GroupingHintPanel chunks={paper.chunks} visible mode="full" />
          ) : (
            <MethodHintPanel
              title={`${method.title} · 挂钩维度`}
              cues={method.replayCues}
              visible
              mode="full"
              helper="下一轮播放时只显示这些维度标签，不摊开答案。"
            />
          )}
          <button type="button" className="btn-primary" onClick={session.goReplayReady}>
            下一步：带提示再听
          </button>
        </div>
      )}

      {(session.phase === 'replay_ready' || session.phase === 'replaying') && (
        <>
          <div className="card">
            <p style={{ fontWeight: 600 }}>第三步：带着方法提示再听</p>
            <p className="muted" style={{ marginTop: 6 }}>
              播放时对照下方提示挂钩记忆；答题时提示会收起。
            </p>
          </div>
          {isChunking ? (
            <GroupingHintPanel chunks={paper.chunks} visible mode="tagsOnly" />
          ) : (
            <MethodHintPanel
              title={`${method.title}提示`}
              cues={method.replayCues}
              visible
              mode="tagsOnly"
              helper="只看维度，自己把听到的内容挂钩上去"
            />
          )}
          <PlayOnceBar
            playStatus={session.playStatus}
            phase={session.phase}
            playedOnce={false}
            allowReplay
            label="再次播放（带方法提示）"
            onPlay={() => {
              setAnsweringPass('after');
              session.startReplay();
            }}
            hint="仅教学流程允许再听一次"
          />
        </>
      )}

      {session.phase === 'compare' && (
        <div className="card stack">
          <div className="page-title" style={{ fontSize: 18 }}>
            前后对比
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>盲听正确</span>
            <strong>
              {blindSummary ? `${blindSummary.correct}/${blindSummary.total}` : '—'}
            </strong>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>方法后再测</span>
            <strong className="success-text">
              {afterSummary ? `${afterSummary.correct}/${afterSummary.total}` : '—'}
            </strong>
          </div>
          <p className="muted">教学不计正式分。可回方法列表继续学，或去练听力巩固。</p>
          <Link to="/methods" className="btn-primary">
            返回方法列表
          </Link>
          <Link to="/" className="btn-secondary">
            返回首页
          </Link>
        </div>
      )}
    </Layout>
  );
}

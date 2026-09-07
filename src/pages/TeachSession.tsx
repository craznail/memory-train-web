import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayOnceBar } from '../components/PlayOnceBar';
import { QuestionCard } from '../components/QuestionCard';
import { GroupingHintPanel } from '../components/GroupingHintPanel';
import { pickPaperByIndex } from '../data/papers';
import { useListenSession } from '../hooks/useListenSession';
import { gradeAnswers, summarizePractice, isAnswerCorrect } from '../lib/scoring';
import type { PracticeSummary } from '../types';

const STEPS = ['盲听', '讲解', '带提示再听', '对比'] as const;

export function TeachSession() {
  const paper = useMemo(() => pickPaperByIndex(0), []);
  const session = useListenSession({
    paper,
    mode: 'teach',
    enableInterference: false,
  });

  const [blindSummary, setBlindSummary] = useState<PracticeSummary | null>(null);
  const [afterSummary, setAfterSummary] = useState<PracticeSummary | null>(null);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [answeringPass, setAnsweringPass] = useState<'blind' | 'after'>('blind');

  const stepIndex =
    session.phase === 'ready' || session.phase === 'playing' || (session.phase === 'answering' && answeringPass === 'blind') || session.phase === 'played'
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

  return (
    <Layout title="学分组">
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
            hint="盲听阶段不会显示分组提示"
          />
        </>
      )}

      {session.phase === 'answering' && q && (
        <>
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
        </>
      )}

      {session.phase === 'explain' && (
        <div className="card stack">
          <div className="page-title" style={{ fontSize: 18 }}>
            什么是 Chunking（分组记忆）？
          </div>
          <p>
            把一长串信息按固定类别拆开，例如：
            <strong>人物、时间、地点、任务、数字</strong>。
          </p>
          <p className="muted">
            大脑更擅长记住「几组有标签的信息」，而不是一整段连续语音。听的时候主动往这些格子里填，回忆时也按格子提取。
          </p>
          {blindSummary && (
            <p>
              你盲听正确 {blindSummary.correct}/{blindSummary.total} 题
              {session.blindScoreHint !== null ? `（约 ${session.blindScoreHint} 分）` : ''}。
            </p>
          )}
          <GroupingHintPanel chunks={paper.chunks} visible />
          <button type="button" className="btn-primary" onClick={session.goReplayReady}>
            下一步：带提示再听
          </button>
        </div>
      )}

      {(session.phase === 'replay_ready' || session.phase === 'replaying') && (
        <>
          <div className="card">
            <p style={{ fontWeight: 600 }}>第三步：带着分组提示再听</p>
            <p className="muted" style={{ marginTop: 6 }}>
              播放时对照下方维度标签归类记忆；答题时提示会收起，避免开卷。
            </p>
          </div>
          <GroupingHintPanel chunks={paper.chunks} visible mode="tagsOnly" />
          <PlayOnceBar
            playStatus={session.playStatus}
            phase={session.phase}
            playedOnce={false}
            allowReplay
            label="再次播放（带分组提示）"
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
            <span>分组后再测</span>
            <strong className="success-text">
              {afterSummary ? `${afterSummary.correct}/${afterSummary.total}` : '—'}
            </strong>
          </div>
          <p className="muted">
            学会按「人物 / 时间 / 地点 / 任务 / 数字」听记后，通常正确率会提升。可去「练听力」巩固，或用「测听力」更新正式分数。
          </p>
          <GroupingHintPanel chunks={paper.chunks} visible />
          <Link to="/" className="btn-primary">
            返回首页
          </Link>
          <Link to="/practice" className="btn-secondary">
            去练听力
          </Link>
        </div>
      )}
    </Layout>
  );
}

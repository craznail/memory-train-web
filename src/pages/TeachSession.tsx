import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayOnceBar } from '../components/PlayOnceBar';
import { QuestionCard } from '../components/QuestionCard';
import { GroupingHintPanel } from '../components/GroupingHintPanel';
import { MethodHintPanel } from '../components/MethodHintPanel';
import { PalaceRouteCard } from '../components/PalaceRouteCard';
import { StepDots, PlayCard, Chevron } from '../components/v2/V2';
import { PalaceExplainer } from '../components/v2/PalaceExplainer';
import hero1x from '../assets/illustrations/hero-elephant-landscape@1x.webp';
import hero2x from '../assets/illustrations/hero-elephant-landscape@2x.webp';
import empty1x from '../assets/illustrations/elephant-empty@1x.webp';
import empty2x from '../assets/illustrations/elephant-empty@2x.webp';
import correct1x from '../assets/illustrations/elephant-correct@1x.webp';
import correct2x from '../assets/illustrations/elephant-correct@2x.webp';
import { pickPaperByIndex } from '../data/papers';
import { getMethod } from '../data/methods';
import { useListenSession } from '../hooks/useListenSession';
import { loadConfirmedScenes, placeConfirmedImage } from '../lib/confirmedScenes';
import { useDisplayScenes } from '../hooks/useDisplayScenes';
import { gradeAnswers, summarizePractice, isAnswerCorrect } from '../lib/scoring';
import type { PracticeSummary } from '../types';

const STEPS = ['盲听', '讲解', '带提示再听', '对比'] as const;

function CompareColumns({ blind, after }: { blind: PracticeSummary | null; after: PracticeSummary | null }) {
  const total = after?.total ?? blind?.total ?? 5;
  const b = blind?.correct ?? 0;
  const a = after?.correct ?? 0;
  const delta = a - b;
  return (
    <div className="cmp-grid" data-testid="compare">
      <div className="cmp-col">
        <span className="tag">盲听</span>
        <span className="num"><strong>{b}</strong><span>/{total}</span></span>
        <img src={empty1x} srcSet={`${empty1x} 1x, ${empty2x} 2x`} alt="" aria-hidden="true" />
      </div>
      <div className="cmp-delta" aria-label={`变化 ${delta >= 0 ? '+' : ''}${delta}`}>
        <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true"><path d="M2 11h22M17 4l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>{delta >= 0 ? `+${delta}` : delta}</span>
      </div>
      <div className="cmp-col after">
        <span className="tag">用方法后</span>
        <span className="num"><strong>{a}</strong><span>/{total}</span></span>
        <img src={correct1x} srcSet={`${correct1x} 1x, ${correct2x} 2x`} alt="" aria-hidden="true" />
      </div>
    </div>
  );
}

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
  const [storedScenes] = useState(() => loadConfirmedScenes());
  const confirmedScenes = useDisplayScenes(storedScenes);
  const [scenePlacements, setScenePlacements] = useState<Record<string, string>>({});
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const palacePegs = useMemo(
    () =>
      method?.id === 'palace'
        ? method.replayCues.map((cue) => ({ id: cue, slip: cue }))
        : [],
    [method],
  );
  const placeScene = (pegId: string, sceneId: string) => {
    setScenePlacements((prev) =>
      placeConfirmedImage(
        prev,
        pegId,
        sceneId,
        confirmedScenes.map((s) => s.id),
      ),
    );
    setSelectedSceneId(null);
  };

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
      <StepDots steps={STEPS} active={stepIndex} />
      <p className="muted" style={{ textAlign: 'center', marginTop: -4 }}>教学流程不计正式分</p>

      {(session.phase === 'ready' || session.phase === 'playing') && (
        <>
          <div className="card">
            <p style={{ fontWeight: 600 }}>第一步：盲听</p>
            <p className="muted" style={{ marginTop: 6 }}>
              先不看任何提示，听一遍材料，然后回答具体问题。
            </p>
          </div>
          <PlayCard
            playStatus={session.playStatus}
            phase={session.phase}
            playedOnce={session.playedOnce}
            onPlay={() => {
              setAnsweringPass('blind');
              session.startPlay(false);
            }}
            img1x={hero1x}
            img2x={hero2x}
            note="盲听阶段不会显示方法提示"
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
          <h2 className="serif" style={{ fontSize: 24, fontWeight: 900 }}>
            什么是{method.title}？
          </h2>
          {method.id === 'palace' && <PalaceExplainer stops={method.replayCues} />}
          <ol className="v2-numlist">
            {method.explain.map((p, i) => (
              <li key={p.slice(0, 12)}>
                <span className="n" aria-hidden="true">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
          {method.example && <p className="muted">{method.example}</p>}
          {blindSummary && (
            <p>
              你盲听正确 {blindSummary.correct}/{blindSummary.total} 题
              {session.blindScoreHint !== null ? `（约 ${session.blindScoreHint} 分）` : ''}。
            </p>
          )}
          {isChunking ? (
            <GroupingHintPanel chunks={paper.chunks} visible mode="full" />
          ) : method.id === 'palace' ? (
            <PalaceRouteCard
              pegs={palacePegs}
              scenes={confirmedScenes}
              placements={scenePlacements}
              selectedId={selectedSceneId}
              onSelect={setSelectedSceneId}
              onPlace={placeScene}
              mode="place"
              revealed={false}
            />
          ) : (
            <MethodHintPanel
              title={`${method.title} · 挂钩维度`}
              cues={method.replayCues}
              visible
              mode="full"
              helper="下一轮播放时只显示这些维度标签，不摊开答案。"
            />
          )}
          <button type="button" className="btn-gradient btn-cta press" onClick={session.goReplayReady}>
            下一步
            <Chevron />
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
          ) : method.id === 'palace' ? (
            <PalaceRouteCard
              pegs={palacePegs}
              scenes={confirmedScenes}
              placements={scenePlacements}
              selectedId={selectedSceneId}
              onSelect={setSelectedSceneId}
              onPlace={placeScene}
              mode="recall"
              revealed={false}
            />
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
        <>
          <section className="card stack" aria-labelledby="cmp-h">
            <h2 id="cmp-h" className="serif" style={{ fontSize: 24, fontWeight: 900 }}>对比结果</h2>
            <p className="muted">用了「{method.title}」前后，答对的题数对比（教学不计正式分）。</p>
            <CompareColumns blind={blindSummary} after={afterSummary} />
          </section>
          {method.id === 'palace' && (
            <section className="card stack" aria-labelledby="route-h" data-testid="route-recall">
              <h2 id="route-h" className="serif" style={{ fontSize: 22, fontWeight: 900 }}>路线回忆</h2>
              <p className="muted">把要记的内容依次放在这条熟悉的路线上：</p>
              <ol className="route-dots">
                {method.replayCues.map((c, i) => (
                  <li key={c}><span className="n">{i + 1}</span>{c}</li>
                ))}
              </ol>
            </section>
          )}
          <Link to="/methods" className="btn-gradient btn-cta press">
            返回方法列表
            <Chevron />
          </Link>
          <Link to="/" className="btn-soft press">
            返回首页
          </Link>
        </>
      )}
    </Layout>
  );
}

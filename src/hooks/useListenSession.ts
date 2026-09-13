import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paper, SessionPhase, TrackMode } from '../types';
import { playPassage, stopPlayback, type PlayStatus } from '../lib/audio';
import {
  COACH_TIPS,
  estimateDurationMs,
  loadCoachEnabled,
  saveCoachEnabled,
  tipForProgress,
} from '../lib/coach';

export interface UseListenSessionOptions {
  paper: Paper;
  mode: TrackMode;
  enableInterference?: boolean;
  /** Mid-listen coach for test/practice/daily; default on when mode !== teach */
  enableCoach?: boolean;
}

/**
 * Shared listen state machine:
 * ready → playing → [coach_review] → [interference] → answering
 * Teach: ready → playing → answering → explain → replay_ready → replaying → answering → compare
 */
export function useListenSession({
  paper,
  mode,
  enableInterference,
  enableCoach,
}: UseListenSessionOptions) {
  const withInterference =
    enableInterference ?? (mode === 'test' && paper.withInterference);
  const coachAllowed = enableCoach ?? mode !== 'teach';

  const [phase, setPhase] = useState<SessionPhase>('ready');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [interferenceInput, setInterferenceInput] = useState('');
  const [interferenceCorrect, setInterferenceCorrect] = useState<boolean | null>(
    null,
  );
  const [playedOnce, setPlayedOnce] = useState(false);
  const [teachPass, setTeachPass] = useState<1 | 2>(1);
  const [blindScoreHint, setBlindScoreHint] = useState<number | null>(null);
  const [playStatus, setPlayStatus] = useState<PlayStatus>('idle');

  const [coachEnabled, setCoachEnabledState] = useState(() =>
    coachAllowed ? loadCoachEnabled() : false,
  );
  const [coachTip, setCoachTip] = useState<string | null>(null);
  const [coachShownTips, setCoachShownTips] = useState<string[]>([]);
  const coachShownRef = useRef<string[]>([]);
  const coachEnabledRef = useRef(coachEnabled);

  const paperIdRef = useRef(paper.id);

  useEffect(() => {
    coachEnabledRef.current = coachEnabled;
  }, [coachEnabled]);

  const setCoachEnabled = useCallback(
    (on: boolean) => {
      if (!coachAllowed) return;
      setCoachEnabledState(on);
      saveCoachEnabled(on);
      if (!on) setCoachTip(null);
    },
    [coachAllowed],
  );

  const goAfterPlay = useCallback(() => {
    const tips = coachShownRef.current;
    if (coachAllowed && coachEnabledRef.current && tips.length > 0) {
      setCoachShownTips([...tips]);
      setPhase('coach_review');
      return;
    }
    if (withInterference && mode !== 'teach') {
      setPhase('interference');
    } else {
      setPhase('answering');
      setCurrentQ(0);
    }
  }, [coachAllowed, withInterference, mode]);

  const finishCoachReview = useCallback(() => {
    if (withInterference && mode !== 'teach') {
      setPhase('interference');
    } else {
      setPhase('answering');
      setCurrentQ(0);
    }
  }, [withInterference, mode]);

  useEffect(() => {
    if (paperIdRef.current !== paper.id) {
      paperIdRef.current = paper.id;
      stopPlayback();
      setPhase('ready');
      setAnswers({});
      setCurrentQ(0);
      setInterferenceInput('');
      setInterferenceCorrect(null);
      setPlayedOnce(false);
      setTeachPass(1);
      setBlindScoreHint(null);
      setPlayStatus('idle');
      setCoachTip(null);
      setCoachShownTips([]);
      coachShownRef.current = [];
    }
  }, [paper.id]);

  useEffect(() => () => stopPlayback(), []);

  const onCoachProgress = useCallback(
    (ratio: number) => {
      if (!coachAllowed || !coachEnabledRef.current) return;
      const tip = tipForProgress(ratio);
      setCoachTip(tip);
      if (!coachShownRef.current.includes(tip)) {
        coachShownRef.current = [...coachShownRef.current, tip];
      }
    },
    [coachAllowed],
  );

  const startPlay = useCallback(
    (isReplay = false) => {
      if (!isReplay && playedOnce && mode !== 'teach') return;
      setPhase(isReplay ? 'replaying' : 'playing');
      setPlayStatus('loading');
      setCoachTip(null);
      if (!isReplay) {
        coachShownRef.current = [];
        setCoachShownTips([]);
        if (coachAllowed && coachEnabledRef.current) {
          setCoachTip(COACH_TIPS[0]);
          coachShownRef.current = [COACH_TIPS[0]];
        }
      }
      const estimated = estimateDurationMs(paper.passage);
      playPassage({
        text: paper.passage,
        audioUrl: paper.audioUrl,
        estimatedDurationMs: estimated,
        onStatus: setPlayStatus,
        onProgress: isReplay ? undefined : onCoachProgress,
        onEnd: () => {
          setCoachTip(null);
          if (isReplay) {
            setPhase('answering');
            setCurrentQ(0);
            return;
          }
          setPlayedOnce(true);
          goAfterPlay();
        },
      });
    },
    [
      paper.passage,
      paper.audioUrl,
      playedOnce,
      mode,
      coachAllowed,
      onCoachProgress,
      goAfterPlay,
    ],
  );

  const submitInterference = useCallback(() => {
    const expected = paper.interference?.answer;
    const num = Number(interferenceInput.trim());
    const ok = expected !== undefined && num === expected;
    setInterferenceCorrect(ok);
    setPhase('answering');
    setCurrentQ(0);
  }, [interferenceInput, paper.interference]);

  const setAnswer = useCallback((qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentQ < paper.questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setPhase('feedback');
    }
  }, [currentQ, paper.questions.length]);

  const goToResult = useCallback(() => setPhase('result'), []);

  const goExplain = useCallback(() => setPhase('explain'), []);

  const goReplayReady = useCallback(() => {
    setTeachPass(2);
    setAnswers({});
    setCurrentQ(0);
    setPhase('replay_ready');
  }, []);

  const startReplay = useCallback(() => {
    startPlay(true);
  }, [startPlay]);

  const goCompare = useCallback(() => setPhase('compare'), []);

  const recordBlindHint = useCallback((score: number) => {
    setBlindScoreHint(score);
  }, []);

  return {
    phase,
    setPhase,
    answers,
    setAnswer,
    currentQ,
    setCurrentQ,
    interferenceInput,
    setInterferenceInput,
    interferenceCorrect,
    playedOnce,
    teachPass,
    blindScoreHint,
    withInterference,
    playStatus,
    coachAllowed,
    coachEnabled,
    setCoachEnabled,
    coachTip,
    coachShownTips,
    finishCoachReview,
    startPlay,
    submitInterference,
    nextQuestion,
    goToResult,
    goExplain,
    goReplayReady,
    startReplay,
    goCompare,
    recordBlindHint,
  };
}

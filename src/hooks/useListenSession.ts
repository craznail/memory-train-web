import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paper, SessionPhase, TrackMode } from '../types';
import { playPassage, stopPlayback, type PlayStatus } from '../lib/audio';

export interface UseListenSessionOptions {
  paper: Paper;
  mode: TrackMode;
  enableInterference?: boolean;
}

/**
 * Shared listen state machine:
 * ready → playing → [interference] → answering
 * Teach: ready → playing → answering → explain → replay_ready → replaying → answering → compare
 */
export function useListenSession({
  paper,
  mode,
  enableInterference,
}: UseListenSessionOptions) {
  const withInterference =
    enableInterference ?? (mode === 'test' && paper.withInterference);

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

  const paperIdRef = useRef(paper.id);

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
    }
  }, [paper.id]);

  useEffect(() => () => stopPlayback(), []);

  const startPlay = useCallback(
    (isReplay = false) => {
      if (!isReplay && playedOnce && mode !== 'teach') return;
      setPhase(isReplay ? 'replaying' : 'playing');
      setPlayStatus('loading');
      playPassage({
        text: paper.passage,
        audioUrl: paper.audioUrl,
        onStatus: setPlayStatus,
        onEnd: () => {
          if (isReplay) {
            setPhase('answering');
            setCurrentQ(0);
            return;
          }
          setPlayedOnce(true);
          if (withInterference && mode !== 'teach') {
            setPhase('interference');
          } else {
            setPhase('answering');
            setCurrentQ(0);
          }
        },
      });
    },
    [paper.passage, paper.audioUrl, playedOnce, mode, withInterference],
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

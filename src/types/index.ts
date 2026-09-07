/** Weak-point categories tracked after a test session */
export type WeakCategory = '人物' | '时间' | '地点' | '任务' | '数字';

export type QuestionCategory = WeakCategory;

export interface Question {
  id: string;
  prompt: string;
  /** Correct answer text (exact or accepted) */
  answer: string;
  /** Optional choices for multiple-choice UI; if absent, free text */
  choices?: string[];
  category: QuestionCategory;
}

export interface ChunkHint {
  label: string;
  text: string;
}

export interface Paper {
  id: string;
  title: string;
  /** Full passage spoken by TTS */
  passage: string;
  /** Chunking groups for teach mode second listen */
  chunks: ChunkHint[];
  questions: Question[];
  /** Whether this paper includes anti-interference math */
  withInterference: boolean;
  /** Simple math prompt, e.g. "3 + 5 = ?" */
  interference?: {
    prompt: string;
    answer: number;
  };
}

export type TrackMode = 'test' | 'teach' | 'practice';

/** Shared listen-flow states */
export type SessionPhase =
  | 'idle'
  | 'ready'
  | 'playing'
  | 'played'
  | 'interference'
  | 'answering'
  | 'feedback'
  | 'result'
  /** teach-only phases */
  | 'explain'
  | 'replay_ready'
  | 'replaying'
  | 'compare';

export interface AnswerRecord {
  questionId: string;
  userAnswer: string;
  correct: boolean;
  missed: boolean;
  category: QuestionCategory;
}

export interface ScoreBreakdown {
  overall: number;
  auditory: number;
  antiInterference: number;
  weakPoints: WeakCategory[];
  date: string;
  paperId: string;
}

export interface ScoreHistory {
  latest: ScoreBreakdown | null;
  history: ScoreBreakdown[];
}

export interface PracticeSummary {
  correct: number;
  wrong: number;
  missed: number;
  total: number;
  records: AnswerRecord[];
}

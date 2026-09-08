import type {
  AnswerRecord,
  Paper,
  QuestionCategory,
  ScoreBreakdown,
  WeakCategory,
  PracticeSummary,
  CategoryStat,
} from '../types';

const ALL_WEAK: WeakCategory[] = ['人物', '时间', '地点', '任务', '数字'];

export function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, '').toLowerCase();
}

export function isAnswerCorrect(userAnswer: string, correct: string): boolean {
  const u = normalizeAnswer(userAnswer);
  const c = normalizeAnswer(correct);
  if (!u) return false;
  return u === c || u.includes(c) || c.includes(u);
}

export function gradeAnswers(
  paper: Paper,
  answers: Record<string, string>,
): AnswerRecord[] {
  return paper.questions.map((q) => {
    const userAnswer = answers[q.id] ?? '';
    const missed = !userAnswer.trim();
    const correct = !missed && isAnswerCorrect(userAnswer, q.answer);
    return {
      questionId: q.id,
      userAnswer,
      correct,
      missed,
      category: q.category,
    };
  });
}

export function computeCategoryStats(records: AnswerRecord[]): CategoryStat[] {
  return ALL_WEAK.map((category) => {
    const inCat = records.filter((r) => r.category === category);
    return {
      category,
      correct: inCat.filter((r) => r.correct).length,
      total: inCat.length,
    };
  });
}

export function computeWeakPoints(records: AnswerRecord[]): WeakCategory[] {
  const wrongCats = new Set<WeakCategory>();
  for (const r of records) {
    if (!r.correct) {
      if (ALL_WEAK.includes(r.category as WeakCategory)) {
        wrongCats.add(r.category as WeakCategory);
      }
    }
  }
  return ALL_WEAK.filter((c) => wrongCats.has(c));
}

/**
 * Score = overall + auditory + anti-interference.
 * auditory: % correct on questions (0–100)
 * antiInterference: 100 if math correct (or skipped/N/A), else 0–50 stub
 * overall: weighted average
 */
export function computeTestScore(
  paper: Paper,
  records: AnswerRecord[],
  interferenceCorrect: boolean | null,
): ScoreBreakdown {
  const total = records.length || 1;
  const correctCount = records.filter((r) => r.correct).length;
  const auditory = Math.round((correctCount / total) * 100);

  let antiInterference = 100;
  if (paper.withInterference && interferenceCorrect !== null) {
    antiInterference = interferenceCorrect ? 100 : 40;
  }

  const overall = Math.round(auditory * 0.7 + antiInterference * 0.3);

  return {
    overall,
    auditory,
    antiInterference,
    weakPoints: computeWeakPoints(records),
    date: new Date().toISOString(),
    paperId: paper.id,
    categoryStats: computeCategoryStats(records),
    interferencePassed: interferenceCorrect,
  };
}

export function summarizePractice(records: AnswerRecord[]): PracticeSummary {
  const correct = records.filter((r) => r.correct).length;
  const missed = records.filter((r) => r.missed).length;
  const wrong = records.filter((r) => !r.correct && !r.missed).length;
  return {
    correct,
    wrong,
    missed,
    total: records.length,
    records,
  };
}

export function categoryLabel(c: QuestionCategory): string {
  return c;
}

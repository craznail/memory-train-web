import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ScoreCard } from '../components/ScoreCard';
import { EntryCard } from '../components/EntryCard';
import { loadScoreHistory } from '../lib/storage';
import type { ScoreHistory } from '../types';

export function Home() {
  const location = useLocation();
  const [history, setHistory] = useState<ScoreHistory>({ latest: null, history: [] });

  useEffect(() => {
    setHistory(loadScoreHistory());
  }, [location.key]);

  return (
    <Layout showBack={false}>
      <div>
        <h1 className="page-title">听力记忆训练</h1>
        <p className="page-sub" style={{ marginTop: 4 }}>
          测一测 · 学方法 · 练听力
        </p>
      </div>

      <ScoreCard score={history.latest} />

      <div className="stack">
        <EntryCard
          to="/daily"
          emoji="📅"
          title="今日训练"
          subtitle="约10～15分钟·不改分"
        />
        <EntryCard
          to="/test"
          emoji="📝"
          title="测听力"
          subtitle="正式评分"
          primary
        />
        <EntryCard
          to="/methods"
          emoji="📚"
          title="学方法"
          subtitle="按优先级逐个学"
        />
        <EntryCard
          to="/practice"
          emoji="🎧"
          title="练听力"
          subtitle="不改分"
        />
      </div>
    </Layout>
  );
}

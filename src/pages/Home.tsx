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
          测一测 · 学分组 · 练听力
        </p>
      </div>

      <ScoreCard score={history.latest} />

      <div className="stack">
        <EntryCard
          to="/test"
          emoji="📝"
          title="测听力"
          subtitle="测评听觉记忆与抗干扰，更新记忆分"
        />
        <EntryCard
          to="/teach"
          emoji="📚"
          title="学分组"
          subtitle="学习 Chunking 分组记忆法（不计分）"
        />
        <EntryCard
          to="/practice"
          emoji="🎧"
          title="练听力"
          subtitle="同形式自由练习，查看对错漏（不计分）"
        />
      </div>
    </Layout>
  );
}

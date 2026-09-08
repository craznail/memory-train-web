import { HashRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { TestSession } from './pages/TestSession';
import { TestResult } from './pages/TestResult';
import { TeachSession } from './pages/TeachSession';
import { MethodsList } from './pages/MethodsList';
import { PracticeSession } from './pages/PracticeSession';
import { PracticeEnd } from './pages/PracticeEnd';
import { DailyTraining } from './pages/DailyTraining';
import { ScoreReport } from './pages/ScoreReport';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<ScoreReport />} />
        <Route path="/daily" element={<DailyTraining />} />
        <Route path="/test" element={<TestSession />} />
        <Route path="/test/result" element={<TestResult />} />
        <Route path="/methods" element={<MethodsList />} />
        <Route path="/teach" element={<TeachSession />} />
        <Route path="/teach/:methodId" element={<TeachSession />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route path="/practice/end" element={<PracticeEnd />} />
      </Routes>
    </HashRouter>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { TestSession } from './pages/TestSession';
import { TestResult } from './pages/TestResult';
import { TeachSession } from './pages/TeachSession';
import { PracticeSession } from './pages/PracticeSession';
import { PracticeEnd } from './pages/PracticeEnd';
import { DailyTraining } from './pages/DailyTraining';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/daily" element={<DailyTraining />} />
        <Route path="/test" element={<TestSession />} />
        <Route path="/test/result" element={<TestResult />} />
        <Route path="/teach" element={<TeachSession />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route path="/practice/end" element={<PracticeEnd />} />
      </Routes>
    </BrowserRouter>
  );
}

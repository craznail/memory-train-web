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
import { ImageryStudio } from './pages/studio/ImageryStudio';
import { EncodingStudio } from './pages/studio/EncodingStudio';
import { AssociationStudio } from './pages/studio/AssociationStudio';
import { PalaceStudio } from './pages/studio/PalaceStudio';

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
        <Route path="/studio/imagery" element={<ImageryStudio />} />
        <Route path="/studio/encoding" element={<EncodingStudio />} />
        <Route path="/studio/association" element={<AssociationStudio />} />
        <Route path="/studio/palace" element={<PalaceStudio />} />
        <Route path="/teach" element={<TeachSession />} />
        <Route path="/teach/:methodId" element={<TeachSession />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route path="/practice/end" element={<PracticeEnd />} />
      </Routes>
    </HashRouter>
  );
}

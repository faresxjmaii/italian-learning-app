import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import FocusTimerProvider from './providers/FocusTimerProvider';
import Dashboard from './pages/Dashboard';
import AddWord from './pages/AddWord';
import WordList from './pages/WordList';
import Review from './pages/Review';
import Settings from './pages/Settings';
import Notes from './pages/Notes';
import Verbs from './pages/Verbs';
import AIAssistant from './pages/AIAssistant';
import VerboQuiz from './pages/VerboQuiz';
import Pronuncia from './pages/Pronuncia';

function App() {
  return (
    <FocusTimerProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="add" element={<AddWord />} />
            <Route path="edit/:id" element={<AddWord />} />
            <Route path="words" element={<WordList />} />
            <Route path="review" element={<Review />} />
            <Route path="verbs" element={<Verbs />} />
            <Route path="verbo-quiz" element={<VerboQuiz />} />
            <Route path="pronuncia" element={<Pronuncia />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notes" element={<Notes />} />
            <Route path="ai" element={<AIAssistant />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FocusTimerProvider>
  );
}

export default App;

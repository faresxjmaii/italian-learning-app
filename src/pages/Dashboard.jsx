import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Link } from 'react-router-dom';
import { PlusCircle, Play, BookOpen, BrainCircuit, BookOpenCheck, StickyNote, Bot, Sparkles, Timer } from 'lucide-react';
import FocusTimer from '../components/FocusTimer';
import { WORD_STATUS, normalizeWordStatus } from '../constants';
import { verbs } from '../data/verbs';

const StatCard = ({ icon, label, value, tone }) => (
  <div className="card p-4 transition-transform duration-200 hover:-translate-y-0.5">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tone}`}>
      {icon}
    </div>
    <p className="text-sm font-semibold text-gray-400">{label}</p>
    <p className="text-2xl font-extrabold text-gray-100 mt-0.5">{value}</p>
  </div>
);

const Dashboard = () => {
  const words = useLiveQuery(() => db.words.toArray());
  const savedVerbs = useLiveQuery(() => db.verbs.toArray());
  const notes = useLiveQuery(() => db.notes.toArray());

  if (!words || !savedVerbs || !notes) {
    return <div className="flex justify-center p-12"><div className="animate-pulse w-8 h-8 rounded-full bg-primary-200"></div></div>;
  }

  const totalWords = words.length;
  const newWords = words.filter(w => normalizeWordStatus(w.status) === WORD_STATUS.NEW).length;
  const totalVerbs = savedVerbs.length + verbs.length;
  const totalNotes = notes.length;

  return (
    <div className="space-y-4 animate-[softFadeIn_220ms_ease-out]">
      <section className="surface-panel p-5 md:p-6 overflow-hidden relative">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-800/70 bg-primary-950/30 px-3 py-1 text-xs font-bold text-primary-300 mb-3">
            <Sparkles size={16} />
            Studio calmo, memoria forte
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-100 leading-tight">
            Il Mio Vocabolario Italiano
          </h1>
          <p className="text-gray-300 mt-2 text-base max-w-2xl">
            Organizza parole, ascolta la pronuncia, ripassa senza stress e costruisci una routine di studio sostenibile.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Link to="/add" className="btn-primary py-3 text-base">
          <PlusCircle size={24} />
          <span>Aggiungi Nuova Parola</span>
        </Link>
        <Link to="/review" className="btn-secondary py-3 text-base">
          <Play size={24} />
          <span>Inizia il Ripasso</span>
        </Link>
        <Link to="/verbo-quiz" className="btn-secondary py-3 text-base border-primary-800/70 text-primary-300 hover:text-primary-200">
          <Timer size={24} />
          <span>Verbo Quiz</span>
        </Link>
        <Link to="/ai" className="btn-secondary py-3 text-base border-primary-800/70 text-primary-300 hover:text-primary-200">
          <Bot size={24} />
          <span>Studio AI</span>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Progressi</h2>
            <p className="text-xs text-gray-500">Una vista rapida del tuo spazio di studio.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<BookOpen size={20} className="text-blue-300" />}
            label="Parole"
            value={totalWords}
            tone="bg-blue-950/50 border border-blue-900/60"
          />
          <StatCard
            icon={<BrainCircuit size={20} className="text-amber-300" />}
            label="Nuove"
            value={newWords}
            tone="bg-amber-950/40 border border-amber-900/50"
          />
          <StatCard
            icon={<BookOpenCheck size={20} className="text-primary-300" />}
            label="Verbi"
            value={totalVerbs}
            tone="bg-primary-950/40 border border-primary-900/60"
          />
          <StatCard
            icon={<StickyNote size={20} className="text-violet-300" />}
            label="Note"
            value={totalNotes}
            tone="bg-violet-950/40 border border-violet-900/50"
          />
        </div>
      </section>

      <FocusTimer />
    </div>
  );
};

export default Dashboard;

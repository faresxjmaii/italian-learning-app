import { useState } from 'react';
import { Bot, MessageCircle, PenLine, Sparkles } from 'lucide-react';
import ExampleAITab from '../components/ai/ExampleAITab';
import CorrectionTab from '../components/ai/CorrectionTab';
import ChatPracticeTab from '../components/ai/ChatPracticeTab';

const tabs = [
  { key: 'example', label: 'Esempio AI', icon: <Sparkles size={18} />, component: ExampleAITab },
  { key: 'correction', label: 'Correggi frase', icon: <PenLine size={18} />, component: CorrectionTab },
  { key: 'chat', label: 'Chat italiano', icon: <MessageCircle size={18} />, component: ChatPracticeTab },
];

const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState('example');
  const ActiveComponent = tabs.find((tab) => tab.key === activeTab)?.component || ExampleAITab;

  return (
    <div className="page-shell">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-primary-900/40 border border-primary-800 flex items-center justify-center text-primary-400">
            <Bot size={26} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Studio AI</h1>
            <p className="text-gray-400">Esempi, correzioni e chat semplice per praticare l'italiano.</p>
          </div>
        </div>
      </header>

      <div className="card p-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-colors ${
                activeTab === key
                  ? 'bg-primary-900/40 text-primary-400 border border-primary-800'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252525]'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="card p-5 md:p-6">
        <ActiveComponent />
      </section>
    </div>
  );
};

export default AIAssistant;

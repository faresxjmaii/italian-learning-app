import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { callAI } from '../../utils/ai';

const ChatPracticeTab = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! Scrivimi una frase semplice in italiano e pratichiamo insieme.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;

    const nextMessages = [...messages, { role: 'user', content: draft.trim() }];
    setMessages(nextMessages);
    setDraft('');
    setIsLoading(true);

    try {
      const data = await callAI({ action: 'chat_practice', messages: nextMessages });
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-4 h-[420px] overflow-y-auto space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-primary-700 text-white'
                : 'bg-[#252525] text-gray-100 border border-gray-800'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#252525] border border-gray-800 rounded-2xl px-4 py-3 text-gray-400 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Sto pensando...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input-field text-left"
          dir="ltr"
          placeholder="Scrivi in italiano..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !draft.trim()} className="btn-primary px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
          <Send size={20} />
          <span>Invia</span>
        </button>
      </form>
    </div>
  );
};

export default ChatPracticeTab;

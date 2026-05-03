import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { callAI } from '../../utils/ai';

const ExampleAITab = () => {
  const [word, setWord] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!word.trim()) {
      toast.error('Inserisci una parola italiana');
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const data = await callAI({ action: 'example_sentence', text: word.trim() });
      setResult(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleGenerate} className="space-y-5">
      <div>
        <label className="label-text">Parola italiana</label>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="input-field text-left"
          dir="ltr"
          placeholder="es. necessario"
        />
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-lg disabled:opacity-60 disabled:cursor-not-allowed">
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        <span>{isLoading ? 'Generazione...' : 'Genera esempio'}</span>
      </button>

      {result && (
        <div className="card p-5 space-y-4 border-primary-900/50">
          <div>
            <p className="label-text">Frase semplice</p>
            <p className="text-xl font-bold text-gray-100" dir="ltr">{result.italianExample}</p>
          </div>
          <div>
            <p className="label-text">Traduzione araba</p>
            <p className="text-xl font-bold text-primary-400">{result.arabicTranslation}</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default ExampleAITab;

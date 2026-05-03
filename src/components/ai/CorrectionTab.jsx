import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { callAI } from '../../utils/ai';

const CorrectionTab = () => {
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCorrect = async (e) => {
    e.preventDefault();
    if (!sentence.trim()) {
      toast.error('Inserisci una frase italiana');
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const data = await callAI({ action: 'correct_sentence', text: sentence.trim() });
      setResult(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleCorrect} className="space-y-5">
      <div>
        <label className="label-text">La tua frase italiana</label>
        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          className="input-field text-left min-h-[120px]"
          dir="ltr"
          placeholder="es. Io andare a scuola oggi"
        />
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-lg disabled:opacity-60 disabled:cursor-not-allowed">
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
        <span>{isLoading ? 'Correzione...' : 'Correggi frase'}</span>
      </button>

      {result && (
        <div className="card p-5 space-y-4 border-primary-900/50">
          <div>
            <p className="label-text">Versione corretta</p>
            <p className="text-xl font-bold text-green-400" dir="ltr">{result.correctedSentence}</p>
          </div>
          <div>
            <p className="label-text">Spiegazione semplice</p>
            <p className="text-gray-200">{result.explanation}</p>
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

export default CorrectionTab;

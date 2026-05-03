import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import toast from 'react-hot-toast';
import { Save, ArrowRight, Languages, Loader2 } from 'lucide-react';
import {
  WORD_CATEGORY,
  WORD_DIFFICULTY,
  WORD_STATUS,
  normalizeWordCategory,
  normalizeWordDifficulty,
  normalizeWordStatus,
} from '../constants';
import { suggestTranslation } from '../utils/translate';

const AddWord = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    italian: '',
    arabic: '',
    exampleIt: '',
    exampleAr: '',
    category: WORD_CATEGORY.GENERAL,
    difficulty: WORD_DIFFICULTY.EASY,
    status: WORD_STATUS.NEW,
    note: '',
    isFavorite: false,
  });

  useEffect(() => {
    if (!isEditing) return;

    db.words.get(Number(id))
      .then((word) => {
        if (!word) {
          toast.error('Parola non trovata');
          navigate('/words');
          return;
        }

        setFormData({
          italian: word.italian || '',
          arabic: word.arabic || '',
          exampleIt: word.exampleIt || '',
          exampleAr: word.exampleAr || '',
          category: normalizeWordCategory(word.category),
          difficulty: normalizeWordDifficulty(word.difficulty),
          status: normalizeWordStatus(word.status),
          note: word.note || '',
          isFavorite: word.isFavorite || false,
        });
      })
      .catch(() => {
        toast.error('Errore durante il caricamento della parola');
        navigate('/words');
      });
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!formData.italian.trim()) return;

    setIsTranslating(true);
    try {
      const translation = await suggestTranslation(formData.italian);
      setFormData((prev) => ({ ...prev, arabic: translation }));
    } catch {
      toast('Traduzione non disponibile al momento', { icon: 'i' });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.italian.trim()) {
      toast.error('Inserisci almeno la parola italiana');
      return;
    }

    setIsSaving(true);
    try {
      const wordData = {
        ...formData,
        updatedAt: new Date(),
      };

      if (isEditing) {
        await db.words.update(Number(id), wordData);
        toast.success('Parola aggiornata con successo!');
      } else {
        await db.words.add({
          ...wordData,
          createdAt: new Date(),
          reviewsCount: 0,
          lastReviewDate: null,
        });
        toast.success('Parola aggiunta con successo!');
      }
      navigate('/words');
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell max-w-2xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-100">
          {isEditing ? 'Modifica Parola' : 'Aggiungi Nuova Parola'}
        </h1>
        <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-200 flex items-center gap-1">
          <span>Indietro</span>
          <ArrowRight size={20} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 card p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-text">Parola in Italiano <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="italian"
              value={formData.italian}
              onChange={handleChange}
              className="input-field text-left"
              dir="ltr"
              placeholder="es. Ciao"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-text !mb-0">Significato / Traduzione</label>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating || !formData.italian.trim()}
                className="text-xs flex items-center gap-1 font-semibold text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed bg-primary-900/20 px-2 py-1.5 rounded-md border border-primary-900/50 transition-colors"
              >
                {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                <span>{isTranslating ? 'Traduzione...' : 'Suggerisci'}</span>
              </button>
            </div>
            <input
              type="text"
              name="arabic"
              value={formData.arabic}
              onChange={handleChange}
              className="input-field"
              placeholder="es. Ciao"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-text">Esempio in Italiano</label>
            <textarea
              name="exampleIt"
              value={formData.exampleIt}
              onChange={handleChange}
              className="input-field text-left min-h-[100px]"
              dir="ltr"
              placeholder="es. Ciao, come stai?"
            />
          </div>

          <div>
            <label className="label-text">Traduzione dell'esempio</label>
            <textarea
              name="exampleAr"
              value={formData.exampleAr}
              onChange={handleChange}
              className="input-field min-h-[100px]"
              placeholder="es. Ciao, come stai?"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary w-full py-3 mt-4 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          <span>{isSaving ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Aggiungi Parola'}</span>
        </button>
      </form>
    </div>
  );
};

export default AddWord;

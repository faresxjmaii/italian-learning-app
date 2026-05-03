import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { BookOpenCheck, Languages, Layers, Loader2, Save, Search, X } from 'lucide-react';
import { db } from '../db';
import VerbCard from '../components/VerbCard';
import { verbs } from '../data/verbs';
import { suggestTranslation } from '../utils/translate';

const pronouns = ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'];

const emptyForm = {
  infinitive: '',
  translation: '',
  tense: 'Presente',
  conjugations: pronouns.map((pronoun) => ({ pronoun, form: '' })),
};

const Verbs = () => {
  const formRef = useRef(null);
  const savedVerbs = useLiveQuery(
    () => db.verbs.orderBy('createdAt').reverse().toArray()
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const localVerbs = savedVerbs || [];
  const allVerbs = [...localVerbs, ...verbs];
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredVerbs = normalizedSearch
    ? allVerbs.filter((verb) =>
        `${verb.infinitive} ${verb.translation || ''}`.toLowerCase().includes(normalizedSearch)
      )
    : allVerbs;
  const isEditing = editingId !== null;

  const resetForm = useCallback(() => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsFormOpen(false);
    setIsSaving(false);
  }, []);

  const handleFieldChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleConjugationChange = useCallback((pronoun, value) => {
    setFormData((prev) => ({
      ...prev,
      conjugations: prev.conjugations.map((item) =>
        item.pronoun === pronoun ? { ...item, form: value } : item
      ),
    }));
  }, []);

  const handleTranslate = useCallback(async (e) => {
    e.preventDefault();
    if (!formData.infinitive.trim()) return;

    setIsTranslating(true);
    try {
      const translation = await suggestTranslation(formData.infinitive);
      setFormData((prev) => ({ ...prev, translation }));
    } catch {
      toast('Traduzione non disponibile al momento', { icon: 'i' });
    } finally {
      setIsTranslating(false);
    }
  }, [formData.infinitive]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!formData.infinitive.trim()) {
      toast.error('Inserisci il nome del verbo');
      return;
    }

    const cleanedVerb = {
      infinitive: formData.infinitive.trim(),
      translation: formData.translation.trim(),
      tense: formData.tense.trim() || 'Presente',
      conjugations: formData.conjugations.map((item) => ({
        pronoun: item.pronoun,
        form: item.form.trim(),
      })),
      updatedAt: new Date(),
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        await db.verbs.update(editingId, cleanedVerb);
        toast.success('Verbo aggiornato');
      } else {
        await db.verbs.add({
          ...cleanedVerb,
          createdAt: new Date(),
        });
        toast.success('Verbo aggiunto');
      }
      resetForm();
    } catch {
      toast.error('Errore durante il salvataggio del verbo');
    } finally {
      setIsSaving(false);
    }
  }, [editingId, formData, isEditing, isSaving, resetForm]);

  const handleEdit = useCallback((verb) => {
    setFormData({
      infinitive: verb.infinitive || '',
      translation: verb.translation || '',
      tense: verb.tense || 'Presente',
      conjugations: pronouns.map((pronoun) => {
        const existing = verb.conjugations?.find((item) => item.pronoun === pronoun);
        return { pronoun, form: existing?.form || '' };
      }),
    });
    setEditingId(verb.id);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Vuoi eliminare questo verbo?')) return;

    try {
      await db.verbs.delete(id);
      toast.success('Verbo eliminato');
      if (editingId === id) resetForm();
    } catch {
      toast.error("Errore durante l'eliminazione del verbo");
    }
  }, [editingId, resetForm]);

  useEffect(() => {
    if (!isFormOpen) return undefined;

    const scrollTimer = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

    return () => window.clearTimeout(scrollTimer);
  }, [isFormOpen, editingId]);

  return (
    <div className="page-shell">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-900/40 text-primary-300 text-sm font-semibold border border-primary-800/70 mb-4">
            <Layers size={16} />
            Grammatica italiana
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 mb-2">Verbi</h1>
          <p className="text-gray-400 max-w-2xl">
            Studia le coniugazioni italiane con carte chiare, ordinate e facili da ripassare.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="btn-primary py-3 px-5 text-base"
        >
          <BookOpenCheck size={22} />
          <span>Aggiungi Verbo</span>
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-12"
          placeholder="Cerca un verbo..."
        />
      </div>

      {isFormOpen && (
        <section ref={formRef} className="card p-5 md:p-6 border-t-4 border-t-primary-500 scroll-mt-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-xl font-bold text-gray-100">
              {isEditing ? 'Modifica Verbo' : 'Aggiungi Verbo'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              title="Chiudi"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-text">Verbo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="infinitive"
                  value={formData.infinitive}
                  onChange={handleFieldChange}
                  className="input-field"
                  placeholder="es. Fare"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-text !mb-0">Traduzione</label>
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={isTranslating || !formData.infinitive.trim()}
                    className="text-xs flex items-center gap-1 font-semibold text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed bg-primary-900/20 px-2 py-1.5 rounded-md border border-primary-900/50 transition-colors"
                  >
                    {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                    <span>{isTranslating ? 'Traduzione...' : 'Suggerisci'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="translation"
                  value={formData.translation}
                  onChange={handleFieldChange}
                  className="input-field"
                  placeholder="es. يفعل"
                />
              </div>
              <div>
                <label className="label-text">Tempo</label>
                <input
                  type="text"
                  name="tense"
                  value={formData.tense}
                  onChange={handleFieldChange}
                  className="input-field"
                  placeholder="Presente"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.conjugations.map((item) => (
                <div key={item.pronoun}>
                  <label className="label-text">{item.pronoun}</label>
                  <input
                    type="text"
                    value={item.form}
                    onChange={(e) => handleConjugationChange(item.pronoun, e.target.value)}
                    className="input-field"
                    placeholder={`es. ${item.pronoun}...`}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary py-3 px-5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                <span>{isSaving ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Salva Verbo'}</span>
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary py-3 px-5">
                Annulla
              </button>
            </div>
          </form>
        </section>
      )}

      {!savedVerbs ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse w-8 h-8 rounded-full bg-primary-200"></div>
        </div>
      ) : (
        <section className="grid gap-4">
          {filteredVerbs.length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-[#252525] rounded-xl border border-gray-800">
              Nessun verbo trovato
            </p>
          ) : filteredVerbs.map((verb) => {
            const isLocalVerb = typeof verb.id === 'number';
            return (
              <VerbCard
                key={`${isLocalVerb ? 'local' : 'base'}-${verb.id}`}
                verb={verb}
                onEdit={isLocalVerb ? handleEdit : undefined}
                onDelete={isLocalVerb ? handleDelete : undefined}
              />
            );
          })}
        </section>
      )}

      <section className="card p-5 border-l-4 border-l-primary-500">
        <div className="flex items-start gap-3">
          <BookOpenCheck className="text-primary-400 mt-1 shrink-0" size={22} />
          <div>
            <h2 className="text-lg font-bold text-gray-100 mb-1">I tuoi verbi restano salvati</h2>
            <p className="text-gray-400">
              I verbi che aggiungi vengono salvati localmente nel browser e ricompaiono quando riapri l'app.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Verbs;

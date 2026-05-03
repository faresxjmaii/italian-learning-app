import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Check, Eye, EyeOff, Languages, Loader2, Pencil, Plus, StickyNote, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { suggestTranslation } from '../utils/translate';

const setIdLoading = (setter, id, isLoading) => {
  setter((prev) => {
    const next = new Set(prev);
    if (isLoading) next.add(id);
    else next.delete(id);
    return next;
  });
};

const NoteCard = ({
  note,
  isTranslating,
  isSavingTranslation,
  isDeleting,
  isEditingTranslation,
  isTranslationHidden,
  translationDraft,
  onTranslationDraftChange,
  onTranslate,
  onDelete,
  onStartManualTranslation,
  onCancelManualTranslation,
  onSaveManualTranslation,
  onToggleTranslation,
}) => {
  const hasTranslation = Boolean(note.translationAr?.trim());

  return (
    <li className="group p-5 bg-[#11191d] border border-white/10 rounded-xl hover:border-amber-500/40 transition-colors">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
            {note.content}
          </p>

          {hasTranslation && !isTranslationHidden && !isEditingTranslation && (
            <div className="mt-4 rounded-xl border border-primary-900/60 bg-primary-900/20 p-4">
              <p className="text-xs font-semibold uppercase text-primary-300 mb-2">
                Traduzione araba
              </p>
              <p className="text-gray-100 whitespace-pre-wrap break-words leading-relaxed text-right" dir="rtl">
                {note.translationAr}
              </p>
            </div>
          )}

          {isEditingTranslation && (
            <div className="mt-4 rounded-xl border border-primary-900/60 bg-primary-900/20 p-4">
              <label className="text-xs font-semibold uppercase text-primary-300 mb-2 block">
                Traduzione araba manuale
              </label>
              <textarea
                value={translationDraft}
                onChange={(e) => onTranslationDraftChange(e.target.value)}
                rows={3}
                dir="rtl"
                placeholder="Scrivi o correggi la traduzione araba..."
                className="input-field w-full text-right resize-none"
              />
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={onCancelManualTranslation}
                  className="btn-secondary px-3 py-2 text-sm"
                >
                  <X size={16} />
                  <span>Annulla</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSaveManualTranslation(note)}
                  disabled={isSavingTranslation}
                  className="btn-primary px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingTranslation ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Salva</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasTranslation && (
            <button
              type="button"
              onClick={() => onToggleTranslation(note.id)}
              className="text-gray-400 hover:text-primary-300 p-2 bg-[#1e1e1e] rounded-lg border border-gray-800 hover:border-primary-800 transition-colors"
              title={isTranslationHidden ? 'Mostra traduzione' : 'Nascondi traduzione'}
            >
              {isTranslationHidden ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => onStartManualTranslation(note)}
            disabled={isEditingTranslation}
            className="text-gray-400 hover:text-amber-300 p-2 bg-[#1e1e1e] rounded-lg border border-gray-800 hover:border-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Modifica traduzione manuale"
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            onClick={() => onTranslate(note)}
            disabled={isTranslating}
            className="text-gray-400 hover:text-primary-300 p-2 bg-[#1e1e1e] rounded-lg border border-gray-800 hover:border-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={hasTranslation ? 'Aggiorna traduzione automatica' : 'Traduci nota'}
          >
            {isTranslating ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            disabled={isDeleting}
            className="text-gray-500 hover:text-red-400 p-2 bg-[#1e1e1e] rounded-lg border border-gray-800 hover:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Elimina nota"
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>
    </li>
  );
};

const Notes = () => {
  const [newNote, setNewNote] = useState('');
  const [translatingNoteIds, setTranslatingNoteIds] = useState(() => new Set());
  const [savingTranslationIds, setSavingTranslationIds] = useState(() => new Set());
  const [deletingNoteIds, setDeletingNoteIds] = useState(() => new Set());
  const [hiddenTranslationIds, setHiddenTranslationIds] = useState(() => new Set());
  const [editingTranslationId, setEditingTranslationId] = useState(null);
  const [translationDraft, setTranslationDraft] = useState('');
  
  const notes = useLiveQuery(
    () => db.notes.orderBy('createdAt').reverse().toArray()
  );

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await db.notes.add({
        content: newNote.trim(),
        createdAt: new Date()
      });
      setNewNote('');
      toast.success('Nota salvata');
    } catch {
      toast.error('Errore durante il salvataggio della nota');
    }
  };

  const handleTranslateNote = async (note) => {
    if (!note?.id || translatingNoteIds.has(note.id)) return;

    setIdLoading(setTranslatingNoteIds, note.id, true);
    try {
      const translation = await suggestTranslation(note.content);
      await db.notes.update(note.id, {
        translationAr: translation,
        updatedAt: new Date(),
      });
      setHiddenTranslationIds((prev) => {
        const next = new Set(prev);
        next.delete(note.id);
        return next;
      });
      toast.success('Traduzione salvata');
    } catch {
      toast.error('Traduzione non disponibile al momento');
    } finally {
      setIdLoading(setTranslatingNoteIds, note.id, false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (deletingNoteIds.has(id)) return;

    setIdLoading(setDeletingNoteIds, id, true);
    try {
      await db.notes.delete(id);
      toast.success('Nota eliminata');
    } catch {
      toast.error("Errore durante l'eliminazione della nota");
    } finally {
      setIdLoading(setDeletingNoteIds, id, false);
    }
  };

  const startManualTranslation = (note) => {
    setEditingTranslationId(note.id);
    setTranslationDraft(note.translationAr || '');
    setHiddenTranslationIds((prev) => {
      const next = new Set(prev);
      next.delete(note.id);
      return next;
    });
  };

  const cancelManualTranslation = () => {
    setEditingTranslationId(null);
    setTranslationDraft('');
  };

  const saveManualTranslation = async (note) => {
    if (!note?.id || savingTranslationIds.has(note.id)) return;

    setIdLoading(setSavingTranslationIds, note.id, true);
    try {
      await db.notes.update(note.id, {
        translationAr: translationDraft.trim(),
        updatedAt: new Date(),
      });
      setEditingTranslationId(null);
      setTranslationDraft('');
      toast.success('Traduzione manuale salvata');
    } catch {
      toast.error('Errore durante il salvataggio della traduzione');
    } finally {
      setIdLoading(setSavingTranslationIds, note.id, false);
    }
  };

  const toggleTranslation = (id) => {
    setHiddenTranslationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="page-shell max-w-3xl mx-auto">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-2">
            <StickyNote className="text-yellow-500" size={32} />
            Le Tue Note
          </h1>
          <p className="text-gray-400 mt-2">Appunti veloci per il tuo apprendimento</p>
        </div>
      </header>

      <div className="card p-5 md:p-6 border-t border-amber-700/60">
        <form onSubmit={handleAddNote} className="flex gap-2 mb-8">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Scrivi una nota veloce..."
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="btn-primary py-2 px-6 flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Aggiungi Nota</span>
          </button>
        </form>

        <div className="space-y-4">
          {!notes ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded"></div>
              </div>
            </div>
          ) : notes.length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-[#252525] rounded-xl border border-gray-800">
              Nessuna nota aggiunta. Scrivi qualcosa qui sopra!
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isTranslating={translatingNoteIds.has(note.id)}
                  isSavingTranslation={savingTranslationIds.has(note.id)}
                  isDeleting={deletingNoteIds.has(note.id)}
                  isEditingTranslation={editingTranslationId === note.id}
                  isTranslationHidden={hiddenTranslationIds.has(note.id)}
                  translationDraft={translationDraft}
                  onTranslationDraftChange={setTranslationDraft}
                  onTranslate={handleTranslateNote}
                  onDelete={handleDeleteNote}
                  onStartManualTranslation={startManualTranslation}
                  onCancelManualTranslation={cancelManualTranslation}
                  onSaveManualTranslation={saveManualTranslation}
                  onToggleTranslation={toggleTranslation}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;

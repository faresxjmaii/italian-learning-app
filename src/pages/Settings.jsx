import { useRef, useState } from 'react';
import { db } from '../db';
import { Download, Upload, AlertTriangle, Info, RefreshCw, Volume2, Database, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTTS } from '../hooks/useTTS';
import {
  normalizeWordCategory,
  normalizeWordDifficulty,
  normalizeWordStatus,
} from '../constants';

const cleanCollection = (items = []) => items.map((item) => {
  const { id, ...rest } = item;
  void id;
  return rest;
});

const normalizeWordForImport = (word) => ({
  ...word,
  status: normalizeWordStatus(word.status),
  difficulty: normalizeWordDifficulty(word.difficulty),
  category: normalizeWordCategory(word.category),
  isFavorite: Boolean(word.isFavorite),
  reviewsCount: Number(word.reviewsCount) || 0,
});

const Settings = () => {
  const fileInputRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const {
    voices,
    italianVoices,
    voicesLoaded,
    isSupported,
    refreshVoices,
    fallbackMessage,
  } = useTTS();

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const [words, notes, verbs] = await Promise.all([
        db.words.toArray(),
        db.notes.toArray(),
        db.verbs.toArray(),
      ]);

      const backup = {
        app: 'il-mio-vocabolario-italiano',
        version: 2,
        exportedAt: new Date().toISOString(),
        words,
        notes,
        verbs,
      };

      const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', dataUrl);
      downloadLink.setAttribute('download', `il-mio-vocabolario-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      toast.success('Backup esportato con successo');
    } catch {
      toast.error("Errore durante l'esportazione");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file || isImporting) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const isLegacyWordsExport = Array.isArray(importedData);
        const words = isLegacyWordsExport ? importedData : importedData.words || [];
        const notes = isLegacyWordsExport ? [] : importedData.notes || [];
        const verbs = isLegacyWordsExport ? [] : importedData.verbs || [];

        if (!Array.isArray(words) || !Array.isArray(notes) || !Array.isArray(verbs)) {
          throw new Error('Invalid backup format');
        }

        const cleanWords = cleanCollection(words).map(normalizeWordForImport);
        const cleanNotes = cleanCollection(notes);
        const cleanVerbs = cleanCollection(verbs);

        await db.transaction('rw', db.words, db.notes, db.verbs, async () => {
          if (cleanWords.length) await db.words.bulkAdd(cleanWords);
          if (cleanNotes.length) await db.notes.bulkAdd(cleanNotes);
          if (cleanVerbs.length) await db.verbs.bulkAdd(cleanVerbs);
        });

        toast.success(`Import completato: ${cleanWords.length} parole, ${cleanNotes.length} note, ${cleanVerbs.length} verbi`);
      } catch {
        toast.error('File non valido. Usa un backup JSON esportato dall’app.');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsImporting(false);
    };
    reader.onerror = () => {
      toast.error('Errore durante la lettura del file');
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    if (isClearing) return;

    if (window.confirm('Attenzione: questa azione cancella parole, note e verbi salvati in questo browser. Continuare?')) {
      setIsClearing(true);
      try {
        await db.transaction('rw', db.words, db.notes, db.verbs, async () => {
          await db.words.clear();
          await db.notes.clear();
          await db.verbs.clear();
        });
        toast.success('Tutti i dati locali sono stati cancellati');
      } catch {
        toast.error('Errore durante la cancellazione dei dati');
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="page-shell max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-gray-100 mb-2">Impostazioni</h1>
        <p className="text-gray-400">Backup, dati locali e diagnostica vocale.</p>
      </header>

      <section className="rounded-xl bg-blue-950/30 border border-blue-900/70 p-5 flex gap-4 text-blue-100">
        <Info className="flex-shrink-0 mt-1 text-blue-400" />
        <div>
          <h2 className="font-bold mb-1">Dati salvati nel browser</h2>
          <p className="text-sm text-blue-100/80">
            Parole, note e verbi restano in IndexedDB su questo dispositivo. Usa il backup JSON per conservarli o spostarli.
          </p>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <Database className="text-primary-400" size={22} />
          <div>
            <h2 className="text-xl font-bold text-gray-100">Backup dati</h2>
            <p className="text-sm text-gray-400">Esporta o importa parole, note e verbi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin text-primary-500" /> : <Download size={20} className="text-primary-500" />}
            {isExporting ? 'Esportazione...' : 'Esporta backup'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="btn-secondary py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isImporting ? <Loader2 size={20} className="animate-spin text-blue-400" /> : <Upload size={20} className="text-blue-400" />}
            {isImporting ? 'Importazione...' : 'Importa backup'}
          </button>
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImport} />
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <Volume2 size={20} className="text-primary-500" />
              Sintesi vocale
            </h2>
            <p className="text-sm text-gray-400 mt-1">Controlla le voci italiane disponibili nel browser.</p>
          </div>
          <button type="button" onClick={refreshVoices} className="btn-secondary py-2 px-3 text-sm">
            <RefreshCw size={16} className="text-primary-500" />
            Aggiorna
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {!isSupported && (
            <div className="rounded-lg border border-amber-800 bg-amber-900/30 p-4 text-sm text-amber-200">
              Questo browser non supporta la sintesi vocale.
            </div>
          )}

          {isSupported && voicesLoaded && italianVoices.length === 0 && (
            <div className="rounded-lg border border-amber-800 bg-amber-900/30 p-4 text-sm text-amber-200">
              <p className="font-semibold">Nessuna voce italiana trovata.</p>
              <p className="mt-1">{fallbackMessage}</p>
            </div>
          )}

          {isSupported && !voicesLoaded && (
            <p className="text-sm text-gray-500">Caricamento delle voci...</p>
          )}

          {isSupported && voicesLoaded && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-gray-800 px-3 py-1 font-semibold text-gray-200">{voices.length} voci</span>
              <span className="rounded-lg bg-primary-900/30 border border-primary-800 px-3 py-1 font-semibold text-primary-400">
                {italianVoices.length} italiane
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="card p-6 border border-red-900/50">
        <h2 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
          <AlertTriangle size={20} /> Zona di sicurezza
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Cancella definitivamente parole, note e verbi salvati in questo browser.
        </p>
        <button
          type="button"
          onClick={clearAllData}
          disabled={isClearing}
          className="btn-danger w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isClearing ? <Loader2 size={20} className="animate-spin" /> : null}
          {isClearing ? 'Cancellazione...' : 'Cancella tutti i dati locali'}
        </button>
      </section>
    </div>
  );
};

export default Settings;

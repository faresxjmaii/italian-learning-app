import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Link } from 'react-router-dom';
import { Search, Edit2, Trash2, Star, BookOpen, Volume2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTTS } from '../hooks/useTTS';
import { WORD_STATUS, normalizeWordStatus } from '../constants';

const INITIAL_VISIBLE_WORDS = 80;
const VISIBLE_WORDS_STEP = 80;

const WordCard = memo(({ word, onDelete, onFavoriteToggle, onSpeak }) => (
  <article className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5">
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <button
        type="button"
        onClick={() => onFavoriteToggle(word)}
        className={`${word.isFavorite ? 'text-amber-300' : 'text-gray-500'} hover:text-amber-300 transition-colors`}
        title="Preferito"
      >
        <Star fill={word.isFavorite ? 'currentColor' : 'none'} size={24} />
      </button>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-extrabold text-gray-100 truncate" dir="ltr">{word.italian}</h3>
          <button
            type="button"
            onClick={() => onSpeak(word.italian)}
            className="text-gray-500 hover:text-primary-300 transition-colors"
            title="Ascolta"
          >
            <Volume2 size={18} />
          </button>
        </div>
        <p className="text-base text-primary-300 font-semibold truncate">{word.arabic}</p>
      </div>
    </div>

    <div className="flex items-center justify-between sm:justify-end gap-4">
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <BookOpen size={14} />
        <span>Ripassi: {word.reviewsCount || 0}</span>
      </div>
      <div className="flex gap-1">
        <Link to={`/edit/${word.id}`} className="p-2 text-blue-400 hover:bg-blue-950/40 rounded-lg transition-colors">
          <Edit2 size={18} />
        </Link>
        <button
          type="button"
          onClick={() => onDelete(word.id)}
          className="p-2 text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  </article>
), (prev, next) => (
  prev.word.id === next.word.id &&
  prev.word.italian === next.word.italian &&
  prev.word.arabic === next.word.arabic &&
  prev.word.isFavorite === next.word.isFavorite &&
  prev.word.reviewsCount === next.word.reviewsCount &&
  prev.onDelete === next.onDelete &&
  prev.onFavoriteToggle === next.onFavoriteToggle &&
  prev.onSpeak === next.onSpeak
));

WordCard.displayName = 'WordCard';

const WordList = () => {
  const { speak } = useTTS();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_WORDS);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const words = useLiveQuery(() => db.words.toArray());
  const wordItems = useMemo(() => words || [], [words]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa parola?')) return;

    try {
      await db.words.delete(id);
      toast.success('Parola eliminata con successo');
    } catch {
      toast.error("Errore durante l'eliminazione della parola");
    }
  }, []);

  const toggleFavorite = useCallback(async (word) => {
    try {
      await db.words.update(word.id, { isFavorite: !word.isFavorite });
    } catch {
      toast.error('Errore durante aggiornamento preferito');
    }
  }, []);

  const handleShowMore = useCallback(() => {
    setVisibleCount((current) => current + VISIBLE_WORDS_STEP);
  }, []);

  const filteredWords = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    const arabicQuery = deferredSearchTerm.trim();

    return wordItems
      .filter((word) => {
        const matchesSearch = !query ||
          (word.italian || '').toLowerCase().includes(query) ||
          (word.arabic || '').includes(arabicQuery);
        const matchesStatus = filterStatus === 'all' || normalizeWordStatus(word.status) === filterStatus;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.id - a.id);
  }, [deferredSearchTerm, filterStatus, wordItems]);

  const visibleWords = useMemo(
    () => filteredWords.slice(0, visibleCount),
    [filteredWords, visibleCount]
  );
  const canShowMore = visibleWords.length < filteredWords.length;

  if (!words) return <div className="flex justify-center p-12"><div className="animate-pulse w-8 h-8 rounded-full bg-primary-200"></div></div>;

  return (
    <div className="page-shell">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100">Dizionario</h1>
          <p className="text-gray-400 mt-1">Sfoglia e cura le tue parole ({filteredWords.length})</p>
        </div>
        <Link to="/add" className="btn-primary py-3 px-5 text-base">
          <PlusCircle size={22} />
          <span>Aggiungi Nuova Parola</span>
        </Link>
      </header>

      <section className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Cerca in italiano o arabo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(INITIAL_VISIBLE_WORDS);
              }}
              className="input-field pl-10 pr-4"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setVisibleCount(INITIAL_VISIBLE_WORDS);
            }}
            className="input-field md:w-48"
          >
            <option value="all">Tutte</option>
            <option value={WORD_STATUS.NEW}>Nuove</option>
            <option value={WORD_STATUS.IN_PROGRESS}>Da ripassare</option>
            <option value={WORD_STATUS.MASTERED}>Imparate</option>
          </select>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {filteredWords.length > 0 ? (
          visibleWords.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              onDelete={handleDelete}
              onFavoriteToggle={toggleFavorite}
              onSpeak={speak}
            />
          ))
        ) : (
          <div className="py-12 text-center text-gray-500 bg-[#1b1d1f] rounded-xl border border-gray-800">
            <p>Nessuna parola corrisponde alla tua ricerca.</p>
          </div>
        )}

        {canShowMore && (
          <button
            type="button"
            onClick={handleShowMore}
            className="btn-secondary py-3 px-5 self-center"
          >
            Mostra altri
          </button>
        )}
      </section>
    </div>
  );
};

export default WordList;

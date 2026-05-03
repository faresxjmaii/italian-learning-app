import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft, Volume2, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTTS } from '../hooks/useTTS';
import { WORD_DIFFICULTY, WORD_STATUS, normalizeWordDifficulty, normalizeWordStatus } from '../constants';

const REVIEW_SECONDS = 7;
const REVIEW_SESSION_LIMIT = 60;

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const uniqueById = (items) => {
  const seenIds = new Set();

  return items.filter((item) => {
    if (!item?.id || seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
};

const buildReviewSession = (words) => {
  const uniqueWords = uniqueById(words);
  const needsReview = uniqueWords.filter((word) => normalizeWordStatus(word.status) !== WORD_STATUS.MASTERED);
  const mastered = uniqueWords.filter((word) => normalizeWordStatus(word.status) === WORD_STATUS.MASTERED);

  return [...shuffle(needsReview), ...shuffle(mastered)].slice(0, REVIEW_SESSION_LIMIT);
};

const Review = () => {
  const navigate = useNavigate();
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionWords, setSessionWords] = useState([]);
  const [score, setScore] = useState({ know: 0, dontKnow: 0 });
  const [missedWords, setMissedWords] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(REVIEW_SECONDS);
  const evaluationLockedRef = useRef(false);
  const { speak } = useTTS();

  const allWords = useLiveQuery(() => db.words.toArray());
  const currentWord = sessionWords[currentWordIndex];
  const totalReviewed = score.know + score.dontKnow;

  useEffect(() => {
    if (!allWords || sessionWords.length > 0) return undefined;

    const sessionTimer = window.setTimeout(() => {
      setSessionWords(buildReviewSession(allWords));
    }, 0);

    return () => window.clearTimeout(sessionTimer);
  }, [allWords, sessionWords.length]);

  const handleEvaluation = useCallback(async (evaluation) => {
    if (!currentWord || evaluationLockedRef.current) return;
    evaluationLockedRef.current = true;

    let newStatus = normalizeWordStatus(currentWord.status);
    let newDifficulty = normalizeWordDifficulty(currentWord.difficulty);

    if (evaluation === 'know') {
      newStatus = WORD_STATUS.MASTERED;
      newDifficulty = WORD_DIFFICULTY.EASY;
    } else if (evaluation === 'dont_know') {
      newStatus = WORD_STATUS.IN_PROGRESS;
      newDifficulty = WORD_DIFFICULTY.HARD;
    }

    try {
      await db.words.update(currentWord.id, {
        status: newStatus,
        difficulty: newDifficulty,
        reviewsCount: (currentWord.reviewsCount || 0) + 1,
        lastReviewDate: new Date(),
      });

      setScore((prev) => ({
        know: prev.know + (evaluation === 'know' ? 1 : 0),
        dontKnow: prev.dontKnow + (evaluation === 'dont_know' ? 1 : 0),
      }));

      if (evaluation === 'dont_know') {
        setMissedWords((prev) => uniqueById([...prev, currentWord]));
      }

      setShowAnswer(false);
      setSecondsLeft(REVIEW_SECONDS);
      setCurrentWordIndex((prev) => prev + 1);

      if (currentWordIndex >= sessionWords.length - 1) {
        toast.success('Hai completato la sessione di ripasso con successo!');
      }
    } catch {
      toast.error("Si e verificato un errore durante l'aggiornamento della parola");
      evaluationLockedRef.current = false;
    }
  }, [currentWord, currentWordIndex, sessionWords.length]);

  useEffect(() => {
    evaluationLockedRef.current = false;
  }, [currentWordIndex]);

  useEffect(() => {
    if (!currentWord || currentWordIndex >= sessionWords.length) return undefined;

    const endsAt = Date.now() + REVIEW_SECONDS * 1000;

    const interval = window.setInterval(() => {
      setSecondsLeft(Math.max(Math.ceil((endsAt - Date.now()) / 1000), 0));
    }, 250);

    const timeout = window.setTimeout(() => {
      handleEvaluation('dont_know');
    }, REVIEW_SECONDS * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [currentWord, currentWordIndex, sessionWords.length, handleEvaluation]);

  const restartSession = () => {
    setSessionWords([]);
    setCurrentWordIndex(0);
    setShowAnswer(false);
    setScore({ know: 0, dontKnow: 0 });
    setMissedWords([]);
    setSecondsLeft(REVIEW_SECONDS);
    evaluationLockedRef.current = false;
  };

  const reviewMissedWords = () => {
    setSessionWords(uniqueById(missedWords));
    setCurrentWordIndex(0);
    setShowAnswer(false);
    setScore({ know: 0, dontKnow: 0 });
    setMissedWords([]);
    setSecondsLeft(REVIEW_SECONDS);
    evaluationLockedRef.current = false;
  };

  if (!allWords) return <div className="flex justify-center p-12"><div className="animate-pulse w-8 h-8 rounded-full bg-primary-200"></div></div>;

  if (allWords.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-200 mb-4">Nessuna parola ancora!</h2>
        <p className="text-gray-400 mb-8">Aggiungi prima alcune parole per iniziare il ripasso.</p>
      </div>
    );
  }

  if (sessionWords.length === 0) {
    return <div className="flex justify-center p-12"><div className="animate-pulse w-8 h-8 rounded-full bg-primary-200"></div></div>;
  }

  if (currentWordIndex >= sessionWords.length) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto mt-10 animate-[softFadeIn_220ms_ease-out]">
        <CheckCircle className="mx-auto text-green-500 mb-6" size={64} />
        <h2 className="text-3xl font-bold text-gray-100 mb-4">Ottimo lavoro!</h2>
        <p className="text-gray-400 mb-6">Hai ripassato tutte le parole programmate per questa sessione.</p>

        <div className="rounded-xl bg-[#252525] border border-gray-800 p-4 mb-4">
          <p className="text-sm font-semibold text-gray-400">Risultato finale</p>
          <p className="text-2xl font-black text-gray-100">
            {score.know} / {totalReviewed}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl border border-green-900/50 bg-green-900/20 p-4">
            <p className="text-3xl font-black text-green-400">{score.know}</p>
            <p className="text-sm font-semibold text-green-300">La so</p>
          </div>
          <div className="rounded-xl border border-red-900/50 bg-red-900/20 p-4">
            <p className="text-3xl font-black text-red-400">{score.dontKnow}</p>
            <p className="text-sm font-semibold text-red-300">Non la so</p>
          </div>
        </div>

        <div className="space-y-3">
          {missedWords.length > 0 && (
            <button onClick={reviewMissedWords} className="btn-primary w-full py-3 text-lg">
              <RotateCcw size={20} /> Rivedi le parole sbagliate
            </button>
          )}
          <button onClick={restartSession} className="btn-secondary w-full py-3 text-lg">
            <RotateCcw size={20} /> Inizia una nuova sessione
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-xl mx-auto mt-4">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 text-gray-400 hover:text-gray-200 flex items-center gap-2 font-semibold transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Indietro</span>
      </button>

      <div className="mb-6 flex justify-between items-center text-sm font-medium text-gray-400">
        <span>Parola {currentWordIndex + 1} di {sessionWords.length}</span>
        <div className="w-48 bg-gray-800 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentWordIndex / sessionWords.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card p-8 min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-visible">
        <div className="absolute top-4 right-4 min-w-16">
          <div className="text-xs font-bold text-primary-400 mb-1">{secondsLeft}s</div>
          <div className="w-16 h-2 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-200"
              style={{ width: `${(secondsLeft / REVIEW_SECONDS) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => speak(currentWord.italian)}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-primary-400 bg-[#252525] hover:bg-[#2a2a2a] rounded-full transition-colors"
        >
          <Volume2 size={24} />
        </button>

        <div className="mb-8 mt-6">
          <h2 className="text-5xl font-bold text-gray-100 mb-6" dir="ltr">{currentWord.italian}</h2>
          {currentWord.exampleIt && (
            <p className="text-gray-400 italic text-lg" dir="ltr">"{currentWord.exampleIt}"</p>
          )}
        </div>

        {showAnswer ? (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-t border-gray-800 pt-8 mb-8 w-full">
              <h3 className="text-3xl font-bold text-primary-400 mb-4">{currentWord.arabic}</h3>
              {currentWord.exampleAr && (
                <p className="text-gray-400 text-lg mb-4">{currentWord.exampleAr}</p>
              )}
              {currentWord.note && (
                <div className="bg-yellow-900/20 text-yellow-500 p-4 rounded-xl text-sm text-left mt-4 border border-yellow-900/50">
                  <strong>Nota:</strong> {currentWord.note}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => handleEvaluation('dont_know')}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 transition-colors border border-red-900/50"
              >
                <XCircle size={28} className="mb-2" />
                <span className="font-semibold text-sm">Non la so</span>
              </button>

              <button
                onClick={() => handleEvaluation('know')}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-green-900/20 hover:bg-green-900/40 text-green-400 transition-colors border border-green-900/50"
              >
                <CheckCircle size={28} className="mb-2" />
                <span className="font-semibold text-sm">La so</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAnswer(true)}
            className="mt-8 btn-primary text-xl py-4 px-12 w-full max-w-xs shadow-md"
          >
            Mostra Significato
          </button>
        )}
      </div>
    </div>
  );
};

export default Review;

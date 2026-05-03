import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, CheckCircle, CircleHelp, Loader2, RotateCcw, Sparkles, Target, Timer, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../db';
import { callAI } from '../utils/ai';

const QUIZ_SECONDS = 20;
const SESSION_LIMIT = 12;
const AI_SESSION_LIMIT = 10;
const FEEDBACK_DELAY = 1100;

const MODES = {
  CLASSIC: 'classic',
  CONTEXT: 'context',
  AI: 'ai',
};

const modeTabs = [
  { key: MODES.CLASSIC, label: 'Classico', icon: <CircleHelp size={18} /> },
  { key: MODES.CONTEXT, label: 'Frasi in contesto', icon: <Sparkles size={18} /> },
  { key: MODES.AI, label: 'Frasi AI', icon: <Bot size={18} /> },
];

const sentenceStarts = {
  io: 'io',
  tu: 'tu',
  'lui / lei': 'lui',
  noi: 'noi',
  voi: 'voi',
  loro: 'loro',
};

const displayPronouns = {
  io: 'Io',
  tu: 'Tu',
  'lui / lei': 'Lui',
  noi: 'Noi',
  voi: 'Voi',
  loro: 'Loro',
};

const contextTemplates = [
  { context: 'universita', build: ({ subject }) => `Domani ${subject} ____ all'universita.` },
  { context: 'universita', build: ({ subject }) => `Durante la lezione ${subject} ____ con attenzione.` },
  { context: 'casa', build: ({ subject }) => `Stasera ${subject} ____ a casa con calma.` },
  { context: 'casa', build: ({ subject }) => `Ogni mattina ${subject} ____ prima di uscire.` },
  { context: 'amici', build: ({ subject }) => `Sabato ${subject} ____ con gli amici in centro.` },
  { context: 'amici', build: ({ subject }) => `Quando incontra gli amici, ${subject} ____ sempre volentieri.` },
  { context: 'lavoro', build: ({ subject }) => `Al lavoro ${subject} ____ molte cose nuove.` },
  { context: 'lavoro', build: ({ subject }) => `Prima della riunione ${subject} ____ tutto con attenzione.` },
  { context: 'bar', build: ({ subject }) => `Al bar ${subject} ____ un caffe veloce.` },
  { context: 'bar', build: ({ subject }) => `Dopo la scuola ${subject} ____ qualcosa al bar.` },
  { context: 'supermercato', build: ({ subject }) => `Al supermercato ${subject} ____ la lista della spesa.` },
  { context: 'supermercato', build: ({ subject }) => `Quando manca il pane, ${subject} ____ al supermercato.` },
  { context: 'trasporto', build: ({ subject }) => `Alla fermata ${subject} ____ l'autobus.` },
  { context: 'trasporto', build: ({ subject }) => `Per arrivare in tempo ${subject} ____ il treno.` },
  { context: 'vita quotidiana', build: ({ subject }) => `Ogni giorno ${subject} ____ un po' di italiano.` },
  { context: 'vita quotidiana', build: ({ subject }) => `Nel tempo libero ${subject} ____ una frase nuova.` },
  { context: 'tempo libero', build: ({ subject }) => `La domenica ${subject} ____ qualcosa di rilassante.` },
  { context: 'tempo libero', build: ({ subject }) => `Quando ha tempo, ${subject} ____ per migliorare.` },
];

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const normalizeText = (value) => String(value || '').trim();
const completeSentence = (sentence, answer) => sentence.replace('____', answer);

const getVerbForms = (verb) =>
  (verb.conjugations || [])
    .map((item) => ({
      pronoun: normalizeText(item.pronoun),
      form: normalizeText(item.form),
    }))
    .filter((item) => item.pronoun && item.form);

const prepareVerbs = (verbs) =>
  verbs
    .map((verb) => ({ ...verb, quizForms: getVerbForms(verb) }))
    .filter((verb) => verb.quizForms.length > 0);

const getQuestionKey = (verb, pronoun, type, extra = '') =>
  `${verb.id || verb.infinitive}-${pronoun}-${type}-${extra}`;

const makeChoices = (correctAnswer, verbForms, allForms) => {
  const choices = [correctAnswer];
  const candidates = shuffle([...verbForms.map((item) => item.form), ...allForms]);

  candidates.forEach((candidate) => {
    if (choices.length >= 4) return;
    if (candidate && !choices.includes(candidate)) choices.push(candidate);
  });

  return shuffle(choices);
};

const buildBalancedEntries = (preparedVerbs) => {
  const groups = shuffle(preparedVerbs).map((verb) => ({
    verb,
    forms: shuffle(verb.quizForms),
  }));
  const entries = [];
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    groups.forEach((group) => {
      const form = group.forms.shift();
      if (!form) return;
      entries.push({ verb: group.verb, form });
      hasMore = true;
    });
  }

  return entries;
};

const buildCompletionQuestion = (verb, form, verbForms, allForms) => {
  const subject = displayPronouns[form.pronoun] || form.pronoun;
  const prompt = `${subject} ____ ogni giorno.`;

  return {
    id: getQuestionKey(verb, form.pronoun, 'completion'),
    mode: MODES.CLASSIC,
    label: 'Completa la frase',
    prompt,
    helper: `Verbo: ${verb.infinitive}`,
    choices: makeChoices(form.form, verbForms, allForms),
    correctAnswer: form.form,
    correction: completeSentence(prompt, form.form),
  };
};

const buildConjugationQuestion = (verb, form, verbForms, allForms) => ({
  id: getQuestionKey(verb, form.pronoun, 'conjugation'),
  mode: MODES.CLASSIC,
  label: 'Scegli la coniugazione corretta',
  prompt: `Verbo: ${verb.infinitive}`,
  helper: `Pronome: ${form.pronoun}`,
  choices: makeChoices(form.form, verbForms, allForms),
  correctAnswer: form.form,
  correction: `${form.pronoun} ${form.form}`,
});

const buildCorrectionQuestion = (verb, form, verbForms) => {
  const subject = displayPronouns[form.pronoun] || form.pronoun;
  const wrongForm = shuffle(verbForms.filter((item) => item.form !== form.form))[0]?.form;
  const hasWrongSentence = Boolean(wrongForm);
  const sentenceForm = hasWrongSentence ? wrongForm : form.form;

  return {
    id: getQuestionKey(verb, form.pronoun, 'correction'),
    mode: MODES.CLASSIC,
    label: 'Correggi la frase',
    prompt: `${subject} ${sentenceForm} ogni giorno.`,
    helper: `Verbo: ${verb.infinitive}`,
    choices: ['Corretto', 'Sbagliato'],
    correctAnswer: hasWrongSentence ? 'Sbagliato' : 'Corretto',
    correction: `${subject} ${form.form} ogni giorno.`,
  };
};

const buildClassicSession = (verbs) => {
  const preparedVerbs = prepareVerbs(verbs);
  const allForms = preparedVerbs.flatMap((verb) => verb.quizForms.map((item) => item.form));

  return buildBalancedEntries(preparedVerbs)
    .map(({ verb, form }, index) => {
      const typeIndex = index % 3;
      if (typeIndex === 0) return buildCompletionQuestion(verb, form, verb.quizForms, allForms);
      if (typeIndex === 1) return buildConjugationQuestion(verb, form, verb.quizForms, allForms);
      return buildCorrectionQuestion(verb, form, verb.quizForms);
    })
    .slice(0, SESSION_LIMIT);
};

const buildContextSession = (verbs) => {
  const preparedVerbs = prepareVerbs(verbs);
  const allForms = preparedVerbs.flatMap((verb) => verb.quizForms.map((item) => item.form));
  const templates = shuffle(contextTemplates);
  const usedPrompts = new Set();

  return buildBalancedEntries(preparedVerbs)
    .map(({ verb, form }, index) => {
      const subject = sentenceStarts[form.pronoun] || form.pronoun;
      const template = templates.find((item, templateIndex) => {
        const prompt = item.build({ subject });
        return !usedPrompts.has(`${prompt}-${templateIndex}`);
      }) || templates[index % templates.length];
      const prompt = template.build({ subject });
      usedPrompts.add(`${prompt}-${index}`);

      return {
        id: getQuestionKey(verb, form.pronoun, 'context', `${template.context}-${index}`),
        mode: MODES.CONTEXT,
        label: `Frasi in contesto: ${template.context}`,
        prompt,
        helper: `Verbo: ${verb.infinitive} | Pronome: ${form.pronoun}`,
        choices: makeChoices(form.form, verb.quizForms, allForms),
        correctAnswer: form.form,
        correction: completeSentence(prompt, form.form),
      };
    })
    .filter((question, index, questions) =>
      questions.findIndex((item) => item.prompt === question.prompt) === index
    )
    .slice(0, SESSION_LIMIT);
};

const normalizeAIQuestions = (result) => {
  const questions = Array.isArray(result?.questions) ? result.questions : [];

  return questions
    .map((question, index) => {
      const correctAnswer = normalizeText(question.correctAnswer);
      const wrongAnswers = Array.isArray(question.wrongAnswers)
        ? question.wrongAnswers.map(normalizeText).filter(Boolean)
        : [];
      const choices = shuffle([correctAnswer, ...wrongAnswers])
        .filter((choice, choiceIndex, list) => choice && list.indexOf(choice) === choiceIndex)
        .slice(0, 4);
      const prompt = normalizeText(question.sentence);

      if (!prompt.includes('____') || !correctAnswer || choices.length < 2) return null;

      return {
        id: `ai-${index}-${prompt}`,
        mode: MODES.AI,
        label: 'Frasi AI',
        prompt,
        helper: `Verbo: ${normalizeText(question.infinitive)} | Pronome: ${normalizeText(question.pronoun)}`,
        choices,
        correctAnswer,
        correction: completeSentence(prompt, correctAnswer),
        arabicTranslation: normalizeText(question.arabicTranslation),
        explanation: normalizeText(question.explanation),
      };
    })
    .filter(Boolean)
    .filter((question, index, list) =>
      list.findIndex((item) => item.prompt === question.prompt) === index
    )
    .slice(0, AI_SESSION_LIMIT);
};

const getAISeedVerbs = (verbs) =>
  prepareVerbs(verbs).map((verb) => ({
    infinitive: verb.infinitive,
    tense: verb.tense || 'Presente',
    conjugations: verb.quizForms,
  }));

const PromptWithBlank = ({ prompt, selectedAnswer, feedback }) => {
  if (!prompt.includes('____')) {
    return (
      <h2 className="text-2xl md:text-3xl font-black text-gray-100 leading-tight" dir="ltr">
        {prompt}
      </h2>
    );
  }

  const [before, after] = prompt.split('____');
  const hasAnswer = Boolean(selectedAnswer);
  const answerTone = feedback
    ? feedback.isCorrect
      ? 'border-green-700 bg-green-900/30 text-green-100 shadow-[0_0_24px_rgba(34,197,94,0.12)]'
      : 'border-red-800 bg-red-900/30 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.12)]'
    : 'border-primary-700 bg-primary-900/30 text-primary-100 shadow-[0_0_24px_rgba(79,211,173,0.12)]';

  return (
    <h2 className="text-2xl md:text-3xl font-black text-gray-100 leading-relaxed" dir="ltr">
      <span>{before}</span>
      <span
        className={`mx-1 inline-flex min-h-12 min-w-28 items-center justify-center rounded-xl border px-4 py-1 align-middle transition-all duration-200 ${
          hasAnswer
            ? answerTone
            : 'border-dashed border-primary-800/80 bg-primary-950/20 text-primary-300'
        }`}
      >
        {hasAnswer ? selectedAnswer : '____'}
      </span>
      <span>{after}</span>
    </h2>
  );
};

const VerboQuiz = () => {
  const navigate = useNavigate();
  const savedVerbs = useLiveQuery(() => db.verbs.toArray());
  const [activeMode, setActiveMode] = useState(MODES.CLASSIC);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiError, setAiError] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [missedQuestions, setMissedQuestions] = useState([]);
  const answerLockedRef = useRef(false);
  const feedbackTimeoutRef = useRef(null);

  const currentQuestion = sessionQuestions[currentIndex];
  const totalAnswered = score.correct + score.incorrect;
  const isFinished = sessionQuestions.length > 0 && currentIndex >= sessionQuestions.length;
  const percentage = totalAnswered > 0 ? Math.round((score.correct / totalAnswered) * 100) : 0;

  const eligibleVerbCount = useMemo(
    () => (savedVerbs || []).filter((verb) => getVerbForms(verb).length > 0).length,
    [savedVerbs]
  );

  const buildSessionForMode = useCallback((mode, sourceQuestions = aiQuestions) => {
    if (mode === MODES.CONTEXT) return buildContextSession(savedVerbs || []);
    if (mode === MODES.AI) return shuffle(sourceQuestions).slice(0, AI_SESSION_LIMIT);
    return buildClassicSession(savedVerbs || []);
  }, [aiQuestions, savedVerbs]);

  const resetQuizState = useCallback((questions) => {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    setSessionQuestions(questions);
    setCurrentIndex(0);
    setSecondsLeft(QUIZ_SECONDS);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore({ correct: 0, incorrect: 0 });
    setMissedQuestions([]);
    answerLockedRef.current = false;
  }, []);

  const startModeSession = useCallback((mode, sourceQuestions) => {
    resetQuizState(buildSessionForMode(mode, sourceQuestions));
  }, [buildSessionForMode, resetQuizState]);

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    setAiError('');
    startModeSession(mode);
  };

  const startNewSession = useCallback(() => {
    startModeSession(activeMode);
  }, [activeMode, startModeSession]);

  const startMissedSession = () => {
    resetQuizState(shuffle(missedQuestions));
  };

  const moveToNextQuestion = useCallback(() => {
    answerLockedRef.current = false;
    setSelectedAnswer(null);
    setFeedback(null);
    setSecondsLeft(QUIZ_SECONDS);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleAnswer = useCallback((answer, timedOut = false) => {
    if (!currentQuestion || answerLockedRef.current) return;
    answerLockedRef.current = true;

    const isCorrect = !timedOut && answer === currentQuestion.correctAnswer;
    setSelectedAnswer(answer);
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    if (!isCorrect) {
      setMissedQuestions((prev) => [...prev, currentQuestion]);
    }

    setFeedback({
      isCorrect,
      message: isCorrect ? 'Corretto!' : 'Sbagliato.',
      correction: currentQuestion.correction,
      explanation: currentQuestion.explanation,
      arabicTranslation: currentQuestion.arabicTranslation,
      timedOut,
    });

    feedbackTimeoutRef.current = window.setTimeout(moveToNextQuestion, FEEDBACK_DELAY);
  }, [currentQuestion, moveToNextQuestion]);

  const generateAIQuestions = async () => {
    if (!savedVerbs || isGeneratingAI) return;

    setIsGeneratingAI(true);
    setAiError('');

    try {
      const result = await callAI({
        action: 'verbo_quiz_pack',
        verbs: getAISeedVerbs(savedVerbs),
      });
      const questions = normalizeAIQuestions(result);

      if (questions.length === 0) {
        throw new Error('Nessuna frase AI valida generata.');
      }

      setAiQuestions(questions);
      resetQuizState(shuffle(questions));
      toast.success('Frasi AI generate');
    } catch (error) {
      setAiError(error.message || 'Generazione AI non riuscita. Usa Frasi in contesto.');
      resetQuizState([]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  useEffect(() => {
    if (!savedVerbs || activeMode === MODES.AI || sessionQuestions.length > 0) return undefined;

    const sessionTimer = window.setTimeout(() => {
      const questions = buildSessionForMode(activeMode);
      if (questions.length > 0) setSessionQuestions(questions);
    }, 0);

    return () => window.clearTimeout(sessionTimer);
  }, [activeMode, buildSessionForMode, savedVerbs, sessionQuestions.length]);

  useEffect(() => {
    answerLockedRef.current = false;
  }, [currentIndex]);

  useEffect(() => {
    if (!currentQuestion || isFinished || answerLockedRef.current) return undefined;

    const endsAt = Date.now() + QUIZ_SECONDS * 1000;
    const interval = window.setInterval(() => {
      setSecondsLeft(Math.max(Math.ceil((endsAt - Date.now()) / 1000), 0));
    }, 250);
    const timeout = window.setTimeout(() => {
      handleAnswer(null, true);
    }, QUIZ_SECONDS * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [currentQuestion, currentIndex, handleAnswer, isFinished]);

  useEffect(() => () => {
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
  }, []);

  if (!savedVerbs) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary-200" />
      </div>
    );
  }

  if (savedVerbs.length === 0 || eligibleVerbCount === 0) {
    return (
      <div className="page-shell max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-200 flex items-center gap-2 font-semibold transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Indietro</span>
        </button>

        <section className="card p-8 text-center">
          <Target className="mx-auto text-primary-400 mb-4" size={52} />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-3">Verbo Quiz Pro</h1>
          <p className="text-gray-400 mb-6">
            {savedVerbs.length === 0
              ? 'Aggiungi prima alcuni verbi per iniziare il quiz.'
              : 'Completa prima alcune coniugazioni per iniziare il quiz.'}
          </p>
          <Link to="/verbs" className="btn-primary py-3 px-5">
            Vai ai Verbi
          </Link>
        </section>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="page-shell max-w-2xl mx-auto">
        <section className="card p-8 text-center animate-[softFadeIn_220ms_ease-out]">
          <CheckCircle className="mx-auto text-green-400 mb-5" size={64} />
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Quiz completato!</h1>
          <p className="text-gray-400 mb-6">Hai finito questa sessione di Verbo Quiz Pro.</p>

          <div className="rounded-xl bg-[#11191d] border border-white/10 p-5 mb-5">
            <p className="text-sm font-semibold text-gray-400">Score totale</p>
            <p className="text-4xl font-black text-gray-100 mt-1">
              {score.correct} / {totalAnswered}
            </p>
            <p className="text-primary-300 font-bold mt-1">{percentage}% di riuscita</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-green-900/50 bg-green-900/20 p-4">
              <p className="text-3xl font-black text-green-400">{score.correct}</p>
              <p className="text-sm font-semibold text-green-300">Corrette</p>
            </div>
            <div className="rounded-xl border border-red-900/50 bg-red-900/20 p-4">
              <p className="text-3xl font-black text-red-400">{score.incorrect}</p>
              <p className="text-sm font-semibold text-red-300">Sbagliate</p>
            </div>
          </div>

          <div className="space-y-3">
            {missedQuestions.length > 0 && (
              <button type="button" onClick={startMissedSession} className="btn-primary w-full py-3 text-lg">
                <RotateCcw size={20} />
                <span>Rivedi gli errori</span>
              </button>
            )}
            <button type="button" onClick={startNewSession} className="btn-secondary w-full py-3 text-lg">
              <RotateCcw size={20} />
              <span>Riprova</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  const progress = sessionQuestions.length > 0 ? ((currentIndex + 1) / sessionQuestions.length) * 100 : 0;

  return (
    <div className="page-shell max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-gray-200 flex items-center gap-2 font-semibold transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Indietro</span>
      </button>

      <section className="surface-panel p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-800/70 bg-primary-950/30 px-3 py-1 text-xs font-bold text-primary-300 mb-3">
              <Target size={16} />
              Mini gioco grammaticale
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-100">Verbo Quiz Pro</h1>
            <p className="text-gray-400 mt-1">Memorizza i verbi con domande rapide e frasi varie.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#11191d] px-4 py-3 min-w-32">
            <p className="text-xs font-bold text-gray-500">Domanda</p>
            <p className="text-2xl font-black text-gray-100">
              {sessionQuestions.length > 0 ? currentIndex + 1 : 0}
              <span className="text-gray-500">/{sessionQuestions.length}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {modeTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleModeChange(tab.key)}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold transition-colors ${
                activeMode === tab.key
                  ? 'bg-primary-900/40 text-primary-400 border border-primary-800'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#252525] border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 h-2 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {activeMode === MODES.AI && (
        <section className="card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Frasi AI</h2>
            <p className="text-sm text-gray-400">
              Genera un pack temporaneo di massimo 10 domande. L'AI viene chiamata solo quando premi il bottone.
            </p>
            {aiError && <p className="text-sm text-red-300 mt-2">{aiError}</p>}
          </div>
          <button
            type="button"
            onClick={generateAIQuestions}
            disabled={isGeneratingAI}
            className="btn-primary py-3 px-5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGeneratingAI ? <Loader2 size={20} className="animate-spin" /> : <Bot size={20} />}
            <span>{isGeneratingAI ? 'Generazione...' : 'Genera nuove frasi AI'}</span>
          </button>
        </section>
      )}

      {sessionQuestions.length === 0 ? (
        <section className="card p-8 text-center">
          <Target className="mx-auto text-primary-400 mb-4" size={52} />
          <h2 className="text-2xl font-bold text-gray-100 mb-3">
            {activeMode === MODES.AI ? 'Genera un pack AI per iniziare' : 'Preparazione quiz...'}
          </h2>
          <p className="text-gray-400">
            {activeMode === MODES.AI
              ? 'Puoi anche passare a Frasi in contesto se vuoi giocare senza AI.'
              : 'Sto preparando una sessione breve e varia.'}
          </p>
        </section>
      ) : (
        <section className="card p-5 md:p-7">
          <div className="flex items-center justify-between gap-4 mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-900/30 text-primary-300 text-sm font-semibold border border-primary-800/70">
              {currentQuestion.label}
            </span>

            <div className="min-w-24 text-right">
              <div className="flex items-center justify-end gap-2 text-primary-300 font-black">
                <Timer size={18} />
                <span>{secondsLeft}s</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-200"
                  style={{ width: `${(secondsLeft / QUIZ_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#11191d] p-5 md:p-6 mb-5">
            <p className="text-sm font-bold text-gray-500 mb-2">{currentQuestion.helper}</p>
            <PromptWithBlank
              prompt={currentQuestion.prompt}
              selectedAnswer={selectedAnswer}
              feedback={feedback}
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {currentQuestion.choices.map((choice) => {
              const isSelected = selectedAnswer === choice;
              const isCorrectChoice = feedback && choice === currentQuestion.correctAnswer;
              const answerClass = feedback
                ? isCorrectChoice
                  ? 'border-green-700 bg-green-900/25 text-green-200'
                  : isSelected
                    ? 'border-red-800 bg-red-900/25 text-red-200'
                    : 'border-gray-800 bg-[#252525] text-gray-400'
                : 'border-gray-800 bg-[#252525] text-gray-100 hover:border-primary-700 hover:bg-primary-950/20 hover:text-primary-100';

              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleAnswer(choice)}
                  disabled={Boolean(feedback)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm md:text-base font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-default ${answerClass}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`mt-5 rounded-xl border p-4 flex items-start gap-3 ${
                feedback.isCorrect
                  ? 'border-green-900/60 bg-green-900/20 text-green-200'
                  : 'border-red-900/60 bg-red-900/20 text-red-200'
              }`}
            >
              {feedback.isCorrect ? <CheckCircle size={22} /> : <XCircle size={22} />}
              <div>
                <p className="font-black">
                  {feedback.timedOut ? 'Tempo scaduto.' : feedback.message}
                </p>
                {!feedback.isCorrect && (
                  <p className="text-sm mt-1">La risposta giusta e: {feedback.correction}</p>
                )}
                {!feedback.isCorrect && feedback.explanation && (
                  <p className="text-sm mt-1">{feedback.explanation}</p>
                )}
                {feedback.arabicTranslation && (
                  <p className="text-sm mt-2 text-primary-100">{feedback.arabicTranslation}</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default VerboQuiz;

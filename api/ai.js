/* global process */

import { sendJson } from './server-utils.js';

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const ACTIONS = {
  example_sentence: {
    system: [
      'You are a patient Italian tutor for an Arabic-speaking beginner.',
      'Create one simple beginner Italian example sentence for the requested word.',
      'Return only valid JSON with keys: italianExample, arabicTranslation.',
      'Keep the Italian sentence short, natural, and easy.',
      'The Arabic translation must be clear and direct.',
    ].join(' '),
    buildUserPrompt: ({ text }) => `Italian word: ${text}`,
    requiredTextError: 'Inserisci una parola italiana.',
  },
  correct_sentence: {
    system: [
      'You are a patient Italian tutor for an Arabic-speaking beginner.',
      'Correct the learner sentence, explain the mistake simply, and translate the corrected version to Arabic.',
      'Return only valid JSON with keys: correctedSentence, explanation, arabicTranslation.',
      'Keep explanations short, friendly, and pedagogical.',
    ].join(' '),
    buildUserPrompt: ({ text }) => `Sentence to correct: ${text}`,
    requiredTextError: 'Inserisci una frase italiana.',
  },
  chat_practice: {
    system: [
      'You are a friendly Italian practice partner for an Arabic-speaking beginner.',
      'Reply in simple Italian.',
      'Gently correct important mistakes without being severe.',
      'Add a brief Arabic explanation only when it helps the learner.',
      'Return only valid JSON with key: reply.',
    ].join(' '),
    buildUserPrompt: ({ messages }) => {
      const history = messages
        .slice(-8)
        .map((message) => `${message.role === 'assistant' ? 'Tutor' : 'Student'}: ${message.content}`)
        .join('\n');

      return `Conversation:\n${history}`;
    },
    requiredTextError: 'Scrivi un messaggio per iniziare la chat.',
  },
  verbo_quiz_pack: {
    system: [
      'You are a precise Italian grammar tutor for an Arabic-speaking beginner.',
      'Generate up to 10 varied Italian verb quiz questions from the provided saved verbs only.',
      'Each question must practice conjugation in context.',
      'Return only valid JSON with key questions.',
      'questions must be an array of objects with keys: sentence, infinitive, pronoun, correctAnswer, wrongAnswers, arabicTranslation, explanation.',
      'sentence must include exactly one blank written as ____.',
      'wrongAnswers must contain exactly 3 plausible but incorrect Italian conjugation choices.',
      'arabicTranslation must translate the complete correct Italian sentence.',
      'explanation must be short and useful when the answer is wrong.',
      'Do not invent infinitives outside the provided verbs.',
      'Avoid repeated contexts and repeated sentence patterns.',
    ].join(' '),
    buildUserPrompt: ({ verbs }) => `Saved verbs JSON:\n${JSON.stringify(verbs || []).slice(0, 12000)}`,
    validatePayload: ({ verbs }) => Array.isArray(verbs) && verbs.length > 0,
    invalidPayloadError: 'Aggiungi prima alcuni verbi per generare il quiz AI.',
  },
};

const extractOutputText = (data) => data.choices?.[0]?.message?.content?.trim() || '';

export const parseModelJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response was not valid JSON.');
    return JSON.parse(match[0]);
  }
};

const cleanText = (text) => String(text || '').trim();

const getLastUserMessage = (messages = []) =>
  [...messages].reverse().find((message) => message.role !== 'assistant')?.content?.trim() || '';

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const unique = (items) => [...new Set(items.filter(Boolean))];

const getVerbForms = (verb) => {
  const conjugations = verb?.conjugations || verb?.forms || {};
  return Object.values(conjugations)
    .flatMap((tense) => (typeof tense === 'object' && tense !== null ? Object.values(tense) : tense))
    .map((value) => String(value || '').trim())
    .filter(Boolean);
};

export const buildLocalQuizQuestions = (verbs = []) => {
  const pronouns = ['io', 'tu', 'lui / lei', 'noi', 'voi', 'loro'];
  const contexts = [
    'ogni giorno',
    'a casa',
    'con gli amici',
    'al lavoro',
    'nel tempo libero',
  ];

  return verbs
    .map((verb, index) => {
      const forms = unique(getVerbForms(verb));
      if (!forms.length) return null;

      const correctAnswer = forms[index % forms.length];
      const pronoun = pronouns[index % pronouns.length];
      const wrongAnswers = unique(forms.filter((form) => form !== correctAnswer)).slice(0, 3);

      while (wrongAnswers.length < 3) {
        wrongAnswers.push(['studio', 'vai', 'parla', 'mangiamo', 'fanno'][wrongAnswers.length]);
      }

      return {
        sentence: `${pronoun} ____ ${contexts[index % contexts.length]}.`,
        infinitive: verb.infinitive || verb.italian || verb.name || 'verbo',
        pronoun,
        correctAnswer,
        wrongAnswers: wrongAnswers.slice(0, 3),
        arabicTranslation: 'Traduzione non disponibile in modalita locale.',
        explanation: `Usa "${correctAnswer}" con il pronome "${pronoun}".`,
      };
    })
    .filter(Boolean)
    .slice(0, 10);
};

export const buildLocalFallback = ({ action, text, messages, ...payload }) => {
  const value = cleanText(text);

  if (action === 'example_sentence') {
    return {
      italianExample: value.toLowerCase() === 'ciao' ? 'Ciao, come stai oggi?' : `Uso "${value}" in una frase semplice.`,
      arabicTranslation: 'Traduzione non disponibile in modalita locale.',
    };
  }

  if (action === 'correct_sentence') {
    return {
      correctedSentence: value,
      explanation: 'Modalita locale: controlla soggetto, verbo e articolo. Configura una chiave AI valida per una correzione completa.',
      arabicTranslation: 'Traduzione non disponibile in modalita locale.',
    };
  }

  if (action === 'chat_practice') {
    const lastMessage = getLastUserMessage(messages);
    return {
      reply: lastMessage
        ? `Ho letto: "${lastMessage}". Prova a rispondere con una frase breve in italiano.`
        : 'Scrivi una frase breve in italiano e continuiamo la pratica.',
    };
  }

  if (action === 'verbo_quiz_pack') {
    return {
      questions: shuffle(buildLocalQuizQuestions(payload.verbs || [])),
    };
  }

  return null;
};

const sendLocalFallback = (res, action, fallback) =>
  sendJson(res, 200, {
    action,
    result: fallback,
    model: 'local-fallback',
    fallback: true,
  });

export const canUseFallbackForApiError = (status, data) => {
  const message = String(data?.error?.message || data?.error || '').toLowerCase();
  return status === 401 || status === 403 || message.includes('user not found') || message.includes('unauthorized') || message.includes('invalid');
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  const { action, text, messages = [], ...payload } = req.body || {};
  const config = ACTIONS[action];

  if (!config) {
    return sendJson(res, 400, { error: 'Azione AI non valida.' });
  }

  if (config.validatePayload && !config.validatePayload(payload)) {
    return sendJson(res, 400, { error: config.invalidPayloadError });
  }

  if (action === 'chat_practice') {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content?.trim()) {
      return sendJson(res, 400, { error: config.requiredTextError });
    }
  } else if (!config.validatePayload && !text?.trim()) {
    return sendJson(res, 400, { error: config.requiredTextError });
  }

  const fallback = buildLocalFallback({ action, text, messages, ...payload });

  if (!process.env.OPENROUTER_API_KEY && fallback) {
    return sendLocalFallback(res, action, fallback);
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return sendJson(res, 500, { error: 'OPENROUTER_API_KEY non configurata sul server.' });
  }

  try {
    const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://127.0.0.1:5173',
        'X-Title': 'Il Mio Vocabolario Italiano',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: config.system },
          { role: 'user', content: config.buildUserPrompt({ text, messages, ...payload }) },
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      if (fallback && canUseFallbackForApiError(response.status, data)) {
        return sendLocalFallback(res, action, fallback);
      }

      return sendJson(res, response.status, {
        error: data.error?.message || 'Errore durante la richiesta AI.',
      });
    }

    const outputText = extractOutputText(data);
    if (!outputText) {
      return sendJson(res, 500, { error: 'Risposta AI vuota.' });
    }

    return sendJson(res, 200, {
      action,
      result: parseModelJson(outputText),
      model: data.model || model,
    });
  } catch (error) {
    console.error('AI route error:', error);
    if (fallback) {
      return sendLocalFallback(res, action, fallback);
    }

    return sendJson(res, 500, { error: 'Errore interno durante la richiesta AI.' });
  }
}

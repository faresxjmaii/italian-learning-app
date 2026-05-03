import { describe, expect, it } from 'vitest';
import {
  buildLocalFallback,
  buildLocalQuizQuestions,
  canUseFallbackForApiError,
  parseModelJson,
} from './ai.js';

describe('AI backend helpers', () => {
  it('parses direct JSON and JSON wrapped in text', () => {
    expect(parseModelJson('{"reply":"ciao"}')).toEqual({ reply: 'ciao' });
    expect(parseModelJson('Risposta:\n{"reply":"va bene"}')).toEqual({ reply: 'va bene' });
  });

  it('builds a local example fallback when AI provider is unavailable', () => {
    const fallback = buildLocalFallback({ action: 'example_sentence', text: 'ciao' });

    expect(fallback).toEqual({
      italianExample: 'Ciao, come stai oggi?',
      arabicTranslation: 'Traduzione non disponibile in modalita locale.',
    });
  });

  it('builds local verb quiz questions from saved conjugations', () => {
    const questions = buildLocalQuizQuestions([
      {
        infinitive: 'studiare',
        conjugations: {
          presente: {
            io: 'studio',
            tu: 'studi',
            noi: 'studiamo',
            loro: 'studiano',
          },
        },
      },
    ]);

    expect(questions).toHaveLength(1);
    expect(questions[0].sentence).toContain('____');
    expect(questions[0].correctAnswer).toBe('studio');
    expect(questions[0].wrongAnswers).toHaveLength(3);
  });

  it('uses fallback for authentication/configuration provider errors', () => {
    expect(canUseFallbackForApiError(401, { error: { message: 'User not found.' } })).toBe(true);
    expect(canUseFallbackForApiError(403, { error: { message: 'Unauthorized' } })).toBe(true);
    expect(canUseFallbackForApiError(429, { error: { message: 'Rate limited' } })).toBe(false);
  });
});

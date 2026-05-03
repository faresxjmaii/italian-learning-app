import Dexie from 'dexie';

export const db = new Dexie('ItalianVocabDB');

db.version(1).stores({
  words: '++id, italian, arabic, category, difficulty, status, isFavorite, createdAt, lastReviewDate'
});

db.version(2).stores({
  words: '++id, italian, arabic, category, difficulty, status, isFavorite, createdAt, lastReviewDate',
  notes: '++id, content, createdAt'
});

db.version(3).stores({
  words: '++id, italian, arabic, category, difficulty, status, isFavorite, createdAt, lastReviewDate',
  notes: '++id, content, createdAt',
  verbs: '++id, infinitive, tense, createdAt, updatedAt'
});

db.version(4).stores({
  words: '++id, italian, arabic, category, difficulty, status, isFavorite, createdAt, lastReviewDate',
  notes: '++id, content, translationAr, createdAt, updatedAt',
  verbs: '++id, infinitive, tense, createdAt, updatedAt'
});

db.version(5).stores({
  words: '++id, italian, arabic, category, difficulty, status, isFavorite, createdAt, lastReviewDate',
  notes: '++id, content, translationAr, createdAt, updatedAt',
  verbs: '++id, infinitive, tense, createdAt, updatedAt'
}).upgrade(async (tx) => {
  const statusMap = {
    Nouveau: 'new',
    Nuovo: 'new',
    'En cours': 'in_progress',
    'In corso': 'in_progress',
    'Da ripassare': 'in_progress',
    'MaÃ®trisÃ©': 'mastered',
    'Maîtrisé': 'mastered',
    Padroneggiato: 'mastered',
    Imparato: 'mastered',
  };

  const difficultyMap = {
    Facile: 'easy',
    Moyen: 'medium',
    Medio: 'medium',
    Difficile: 'hard',
  };

  const categoryMap = {
    Generale: 'general',
    Verbi: 'verbs',
    Nomi: 'nouns',
    Aggettivi: 'adjectives',
    Frasi: 'phrases',
  };

  await tx.table('words').toCollection().modify((word) => {
    word.status = statusMap[word.status] || word.status || 'new';
    word.difficulty = difficultyMap[word.difficulty] || word.difficulty || 'easy';
    word.category = categoryMap[word.category] || word.category || 'general';
  });
});

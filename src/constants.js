export const WORD_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  MASTERED: 'mastered',
};

export const WORD_STATUS_LABELS = {
  [WORD_STATUS.NEW]: 'Nuovo',
  [WORD_STATUS.IN_PROGRESS]: 'Da ripassare',
  [WORD_STATUS.MASTERED]: 'Imparato',
};

export const WORD_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const WORD_DIFFICULTY_LABELS = {
  [WORD_DIFFICULTY.EASY]: 'Facile',
  [WORD_DIFFICULTY.MEDIUM]: 'Medio',
  [WORD_DIFFICULTY.HARD]: 'Difficile',
};

export const WORD_CATEGORY = {
  GENERAL: 'general',
  VERBS: 'verbs',
  NOUNS: 'nouns',
  ADJECTIVES: 'adjectives',
  PHRASES: 'phrases',
};

export const WORD_CATEGORY_LABELS = {
  [WORD_CATEGORY.GENERAL]: 'Generale',
  [WORD_CATEGORY.VERBS]: 'Verbi',
  [WORD_CATEGORY.NOUNS]: 'Nomi',
  [WORD_CATEGORY.ADJECTIVES]: 'Aggettivi',
  [WORD_CATEGORY.PHRASES]: 'Frasi',
};

const LEGACY_STATUS_VALUES = {
  Nouveau: WORD_STATUS.NEW,
  Nuovo: WORD_STATUS.NEW,
  'En cours': WORD_STATUS.IN_PROGRESS,
  'In corso': WORD_STATUS.IN_PROGRESS,
  'Da ripassare': WORD_STATUS.IN_PROGRESS,
  'MaÃ®trisÃ©': WORD_STATUS.MASTERED,
  'Maîtrisé': WORD_STATUS.MASTERED,
  Padroneggiato: WORD_STATUS.MASTERED,
  Imparato: WORD_STATUS.MASTERED,
};

const LEGACY_DIFFICULTY_VALUES = {
  Facile: WORD_DIFFICULTY.EASY,
  Moyen: WORD_DIFFICULTY.MEDIUM,
  Medio: WORD_DIFFICULTY.MEDIUM,
  Difficile: WORD_DIFFICULTY.HARD,
};

const LEGACY_CATEGORY_VALUES = {
  Generale: WORD_CATEGORY.GENERAL,
  Verbi: WORD_CATEGORY.VERBS,
  Nomi: WORD_CATEGORY.NOUNS,
  Aggettivi: WORD_CATEGORY.ADJECTIVES,
  Frasi: WORD_CATEGORY.PHRASES,
};

export const normalizeWordStatus = (status) => (
  Object.values(WORD_STATUS).includes(status) ? status : LEGACY_STATUS_VALUES[status] || WORD_STATUS.NEW
);

export const normalizeWordDifficulty = (difficulty) => (
  Object.values(WORD_DIFFICULTY).includes(difficulty)
    ? difficulty
    : LEGACY_DIFFICULTY_VALUES[difficulty] || WORD_DIFFICULTY.EASY
);

export const normalizeWordCategory = (category) => (
  Object.values(WORD_CATEGORY).includes(category)
    ? category
    : LEGACY_CATEGORY_VALUES[category] || WORD_CATEGORY.GENERAL
);

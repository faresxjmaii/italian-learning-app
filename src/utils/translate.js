export const suggestTranslation = async (text) => {
  if (!text?.trim()) {
    throw new Error('Text is required');
  }

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim() }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.translation) {
    throw new Error(data.error || 'Traduzione non disponibile al momento.');
  }

  return data.translation;
};

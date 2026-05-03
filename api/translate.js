import { sendJson } from './server-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  const { text } = req.body;

  if (!text) {
    return sendJson(res, 400, { error: 'Text is required for translation.' });
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data || !data[0]) {
      console.error('Translation API Error:', data);
      return sendJson(res, response.status || 500, {
        error: 'Error communicating with translation service.' 
      });
    }

    const translatedText = data[0].map(item => item[0]).join('');

    return sendJson(res, 200, { translation: translatedText });

  } catch (error) {
    console.error('Translation error:', error);
    return sendJson(res, 500, { error: 'Internal server error during translation.' });
  }
}

/* global process */

import { isConfiguredSecret, sendJson } from './server-utils.js';

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

export const cleanQuery = (query) => String(query || '').trim().slice(0, 80);
export const hasValidApiKey = (key) => isConfiguredSecret(key, 'your_youtube_data_api_key_here');
export const buildSearchQuery = (word) => `${word} pronuncia italiana how to pronounce ${word} in Italian`;

const mapVideo = (searchItem, detailItem) => {
  const snippet = searchItem.snippet || {};
  const details = detailItem?.snippet || snippet;
  const videoId = searchItem.id?.videoId;

  return {
    videoId,
    title: snippet.title || details.title || 'Video YouTube',
    channelTitle: snippet.channelTitle || details.channelTitle || '',
    thumbnail:
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      '',
    description: details.description || snippet.description || '',
    publishedAt: snippet.publishedAt || '',
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    captionStatus: detailItem?.contentDetails?.caption === 'true' ? 'available' : 'unavailable',
  };
};

const fetchVideoDetails = async (ids, key) => {
  if (ids.length === 0) return [];

  const params = new URLSearchParams({
    key,
    part: 'snippet,contentDetails',
    id: ids.join(','),
  });
  const response = await fetch(`${YOUTUBE_VIDEOS_URL}?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Errore durante il recupero dei dettagli video.');
  }

  return data.items || [];
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  if (!hasValidApiKey(process.env.YOUTUBE_API_KEY)) {
    return sendJson(res, 500, { error: 'YOUTUBE_API_KEY non configurata sul server.' });
  }

  const word = cleanQuery(req.body?.query);
  if (!word) {
    return sendJson(res, 400, { error: 'Inserisci una parola italiana.' });
  }

  try {
    const params = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY,
      part: 'snippet',
      type: 'video',
      maxResults: '5',
      safeSearch: 'moderate',
      relevanceLanguage: 'it',
      videoEmbeddable: 'true',
      q: buildSearchQuery(word),
    });

    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      return sendJson(res, response.status, {
        error: data.error?.message || 'Errore durante la ricerca YouTube.',
      });
    }

    const searchItems = (data.items || []).filter((item) => item.id?.videoId);
    const ids = searchItems.map((item) => item.id.videoId);
    const detailItems = await fetchVideoDetails(ids, process.env.YOUTUBE_API_KEY);
    const detailMap = new Map(detailItems.map((item) => [item.id, item]));
    const videos = searchItems.map((item) => mapVideo(item, detailMap.get(item.id.videoId)));

    return sendJson(res, 200, {
      query: word,
      searchQuery: buildSearchQuery(word),
      videos,
    });
  } catch (error) {
    console.error('YouTube search route error:', error);
    return sendJson(res, 500, { error: 'Errore interno durante la ricerca YouTube.' });
  }
}

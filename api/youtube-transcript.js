import { sendJson } from './server-utils.js';

const YOUTUBE_WATCH_URL = 'https://www.youtube.com/watch';

const cleanVideoId = (videoId) => String(videoId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);

const decodeHtml = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ');

const stripTags = (value) => decodeHtml(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const extractPlayerResponse = (html) => {
  const marker = 'ytInitialPlayerResponse = ';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  let cursor = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; cursor < html.length; cursor += 1) {
    const char = html[cursor];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start + marker.length, cursor + 1);
      }
    }
  }

  return null;
};

const getCaptionTracks = async (videoId) => {
  const response = await fetch(`${YOUTUBE_WATCH_URL}?v=${videoId}&hl=it`);
  const html = await response.text();
  const playerResponseText = extractPlayerResponse(html);
  if (!playerResponseText) return [];

  try {
    const playerResponse = JSON.parse(playerResponseText);
    return playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  } catch {
    return [];
  }
};

const chooseCaptionTrack = (tracks) =>
  tracks.find((track) => track.languageCode?.toLowerCase().startsWith('it')) ||
  tracks.find((track) => track.vssId?.toLowerCase().includes('.it')) ||
  tracks[0];

const parseJson3Transcript = (data) =>
  (data.events || [])
    .filter((event) => Array.isArray(event.segs) && typeof event.tStartMs === 'number')
    .map((event) => ({
      text: event.segs.map((seg) => seg.utf8 || '').join('').replace(/\s+/g, ' ').trim(),
      start: event.tStartMs / 1000,
      duration: typeof event.dDurationMs === 'number' ? event.dDurationMs / 1000 : 0,
    }))
    .filter((segment) => segment.text);

const parseXmlTranscript = (xml) => {
  const matches = [...String(xml || '').matchAll(/<text[^>]*start="([^"]+)"[^>]*(?:dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/g)];
  return matches
    .map((match) => ({
      start: Number(match[1]),
      duration: Number(match[2] || 0),
      text: stripTags(match[3]),
    }))
    .filter((segment) => Number.isFinite(segment.start) && segment.text);
};

const fetchTranscriptFromTrack = async (track) => {
  if (!track?.baseUrl) return [];

  // The official YouTube Captions API requires OAuth and usually only exposes
  // captions owned by the authenticated channel. For this learning feature we
  // can only attempt publicly exposed timedtext tracks server-side. YouTube may
  // still rate-limit or block timedtext with 429, so callers must treat an empty
  // transcript as "not accessible" and avoid showing a non-targeted video.
  const jsonUrl = `${track.baseUrl}${track.baseUrl.includes('?') ? '&' : '?'}fmt=json3`;
  const jsonResponse = await fetch(jsonUrl);
  if (jsonResponse.ok) {
    const data = await jsonResponse.json().catch(() => null);
    if (data) {
      const segments = parseJson3Transcript(data);
      if (segments.length > 0) return segments;
    }
  }

  const xmlResponse = await fetch(track.baseUrl);
  if (!xmlResponse.ok) return [];
  return parseXmlTranscript(await xmlResponse.text());
};

export const getTranscriptForVideo = async (videoId) => {
  return getTimedTranscriptForVideo(videoId);
};

export const getTimedTranscriptForVideo = async (videoId) => {
  const cleanId = cleanVideoId(videoId);
  if (!cleanId) return [];

  const tracks = await getCaptionTracks(cleanId);
  const track = chooseCaptionTrack(tracks);
  if (!track) return [];

  return fetchTranscriptFromTrack(track);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  const videoId = cleanVideoId(req.body?.videoId);
  if (!videoId) {
    return sendJson(res, 400, { error: 'videoId richiesto.' });
  }

  try {
    const transcript = await getTranscriptForVideo(videoId);
    if (transcript.length === 0) {
      return sendJson(res, 404, { error: 'Transcript non disponibile per questo video.' });
    }

    return sendJson(res, 200, { videoId, transcript });
  } catch (error) {
    console.error('YouTube transcript route error:', error);
    return sendJson(res, 500, { error: 'Errore durante il recupero del transcript.' });
  }
}

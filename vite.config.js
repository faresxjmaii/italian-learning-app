/* global process */

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import aiHandler from './api/ai.js'
import youtubeSearchHandler from './api/youtube-search.js'
import youtubeTranscriptHandler from './api/youtube-transcript.js'

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  return JSON.parse(body || '{}');
}

function createViteResponse(res) {
  return {
    status(statusCode) {
      res.statusCode = statusCode;
      return this;
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    },
  };
}

// Plugin to handle /api/translate in dev mode (replaces Vercel serverless locally)
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        try {
          req.body = await readJsonBody(req);
          await aiHandler(req, createViteResponse(res));
        } catch (err) {
          console.error('[vite-ai-plugin]', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid AI request.' }));
        }
      });

      server.middlewares.use('/api/youtube-search', async (req, res) => {
        try {
          req.body = await readJsonBody(req);
          await youtubeSearchHandler(req, createViteResponse(res));
        } catch (err) {
          console.error('[vite-youtube-plugin]', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid YouTube search request.' }));
        }
      });

      server.middlewares.use('/api/youtube-transcript', async (req, res) => {
        try {
          req.body = await readJsonBody(req);
          await youtubeTranscriptHandler(req, createViteResponse(res));
        } catch (err) {
          console.error('[vite-youtube-transcript-plugin]', err);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid YouTube transcript request.' }));
        }
      });

      server.middlewares.use('/api/translate', async (req, res) => {
        // Only handle POST
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
          return;
        }

        // Read request body
        let parsed;
        try {
          parsed = await readJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
          return;
        }

        const { text } = parsed;
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Text is required for translation.' }));
          return;
        }

        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
          const response = await fetch(url);
          const data = await response.json();

          if (!response.ok || !data || !data[0]) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Translation service returned an error.' }));
            return;
          }

          const translatedText = data[0].map(item => item[0]).join('');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ translation: translatedText }));
        } catch (err) {
          console.error('[vite-translate-plugin]', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal error during translation.' }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_MODEL = env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL;
  process.env.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;

  return {
    plugins: [react(), localApiPlugin()],
  };
})

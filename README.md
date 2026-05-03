# Il Mio Vocabolario Italiano

Local-first Italian learning web app built with React, Vite, Tailwind CSS and IndexedDB.

Il Mio Vocabolario Italiano is a personal study app for learning Italian vocabulary, verbs,
pronunciation, notes and review sessions in one calm workspace. The app stores learning data
locally in the browser with Dexie / IndexedDB, while optional AI and YouTube features run through
server-side API routes so secrets are never exposed in the client.

## Features

- Dashboard: daily overview and quick access to study tools.
- Dizionario: personal Italian-Arabic vocabulary list with search, favorites, audio, edit and delete.
- Aggiungi Nuova Parola: add or edit words with optional translation suggestion.
- Ripasso: fast review mode with score, timer and missed-answer review.
- Verbi: save and study Italian verb conjugations.
- Verbo Quiz: mini-game for memorizing verb forms with classic, context and AI-assisted modes.
- Notes: personal notes with Arabic translation, manual editing, show/hide and persistence.
- Pronuncia: YouTube-powered pronunciation search through a backend route.
- Studio AI: OpenRouter-powered examples, correction and simple Italian chat practice.
- Focus Timer: persistent Pomodoro-style timer for study sessions.
- Settings: backup export/import and local data management.

## Tech Stack

- React
- Vite
- Tailwind CSS
- React Router
- Dexie / IndexedDB
- Lucide React
- React Hot Toast
- Vercel-style API routes in `api/`
- Vitest for automated backend/helper tests

## Local Installation

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Build And Quality Checks

```powershell
npm run lint
npm test
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` and add your own keys.

```env
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

Security rules:

- Never commit `.env.local`.
- Never expose API keys in client code.
- Do not use `VITE_` for private keys.
- Configure production environment variables in the hosting provider.

## Data Storage

The app is local-first:

- Words, notes and verbs are stored in IndexedDB through Dexie.
- Focus Timer state is stored in `localStorage`.
- Backups can be exported/imported as JSON from Settings.

External services are only used when the user triggers translation, Studio AI or Pronuncia.

## API Routes

- `api/translate.js`: translation helper route.
- `api/ai.js`: OpenRouter Studio AI route with local fallback for unavailable AI provider errors.
- `api/youtube-search.js`: YouTube Data API search route for Pronuncia.
- `api/youtube-transcript.js`: experimental transcript route for publicly accessible YouTube timed text.

## Portfolio Case Study

### Problem

Language learners often keep vocabulary, verbs, notes, pronunciation practice and review tools in
separate places. This creates friction and makes daily study less consistent.

### Solution

This app brings the core workflow into one local-first interface:

- save words and verbs;
- review them with focused sessions;
- practice verbs through quiz modes;
- write notes and keep Arabic translations;
- listen to pronunciation examples;
- use optional AI support for examples, correction and chat.

### Skills Demonstrated

- React application architecture with reusable pages, components, hooks and providers.
- Local-first data modeling with Dexie and IndexedDB migrations.
- Async UI handling with loading states, error toasts and disabled states.
- API route design for server-side secrets and third-party services.
- Performance-minded UI work on large lists.
- Release preparation with lint, build, tests and secret scanning.
- Product thinking for a real learning workflow.

## GitHub Metadata

Suggested repository description:

```text
Local-first Italian learning web app built with React, Vite, Tailwind CSS and IndexedDB.
```

Suggested topics:

```text
react, vite, tailwindcss, indexeddb, dexie, italian-learning, vocabulary, language-learning, pomodoro, ai
```

## Roadmap

- Add full end-to-end tests for the most important user flows.
- Improve Pronuncia with reliable transcript/timestamp matching.
- Add spaced repetition scheduling for review sessions.
- Add richer statistics for words, verbs and quiz progress.
- Add import conflict handling for duplicate backup data.
- Add optional cloud sync while keeping local-first behavior.

## License

Portfolio project. Add a license before public reuse if needed.

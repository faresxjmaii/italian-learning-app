import { describe, expect, it } from 'vitest';
import { buildSearchQuery, cleanQuery, hasValidApiKey } from './youtube-search.js';

describe('YouTube search helpers', () => {
  it('cleans empty and long queries before using the API', () => {
    expect(cleanQuery('  ciao  ')).toBe('ciao');
    expect(cleanQuery('a'.repeat(100))).toHaveLength(80);
    expect(cleanQuery(null)).toBe('');
  });

  it('keeps the pronunciation query focused on Italian context', () => {
    const query = buildSearchQuery('necessario');

    expect(query).toContain('necessario');
    expect(query).toContain('pronuncia italiana');
    expect(query).toContain('in Italian');
  });

  it('rejects missing placeholder API keys', () => {
    expect(hasValidApiKey()).toBeFalsy();
    expect(hasValidApiKey('your_youtube_data_api_key_here')).toBe(false);
    expect(hasValidApiKey('real-key')).toBe(true);
  });
});

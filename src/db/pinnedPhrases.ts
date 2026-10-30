import { getDb } from './client';
import type { PinnedPhrase } from './types';

/** The pinbook is global per language, so the same phrase stays pinned across trips. */
export async function listPinnedPhrases(languageCode: string): Promise<PinnedPhrase[]> {
  const db = await getDb();
  return db.getAllAsync<PinnedPhrase>(
    'SELECT * FROM pinned_phrases WHERE language_code = ? ORDER BY created_at DESC',
    languageCode
  );
}

export async function listPinnedLanguages(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ language_code: string }>(
    'SELECT DISTINCT language_code FROM pinned_phrases ORDER BY language_code'
  );
  return rows.map((r) => r.language_code);
}

export async function pinPhrase(languageCode: string, phraseId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO pinned_phrases (language_code, phrase_id, created_at) VALUES (?, ?, ?)',
    languageCode,
    phraseId,
    new Date().toISOString()
  );
}

export async function unpinPhrase(languageCode: string, phraseId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM pinned_phrases WHERE language_code = ? AND phrase_id = ?',
    languageCode,
    phraseId
  );
}

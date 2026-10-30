import { getDb } from './client';

/**
 * Raw Places responses, per place and language. A place is fetched once, ever:
 * re-adding it, or adding it to another trip, costs nothing.
 */
export async function getCachedPlace(placeId: string, languageCode: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM place_details_cache WHERE place_id = ? AND language_code = ?',
    placeId,
    languageCode
  );
  return row?.payload ?? null;
}

export async function putCachedPlace(placeId: string, languageCode: string, payload: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO place_details_cache (place_id, language_code, payload, fetched_at) VALUES (?, ?, ?, ?)',
    placeId,
    languageCode,
    payload,
    new Date().toISOString()
  );
}

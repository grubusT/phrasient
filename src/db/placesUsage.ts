import { getDb } from './client';
import { todayISO } from '../lib/date';

/**
 * Local count of Places requests per calendar day. A comfort guard so a runaway
 * loop or a long session cannot quietly run up a bill; the hard cap is the Cloud
 * Console quota. Days roll over by key, so there is nothing to reset.
 */
export async function placesCallsToday(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ calls: number }>(
    'SELECT calls FROM places_usage WHERE day = ?',
    todayISO()
  );
  return row?.calls ?? 0;
}

/** Records one call if the limit allows it. Returns false once today's limit is spent. */
export async function takePlacesCall(dailyLimit: number): Promise<boolean> {
  const db = await getDb();
  const day = todayISO();
  let allowed = false;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ calls: number }>('SELECT calls FROM places_usage WHERE day = ?', day);
    if ((row?.calls ?? 0) >= dailyLimit) return;
    await db.runAsync(
      'INSERT INTO places_usage (day, calls) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET calls = calls + 1',
      day
    );
    allowed = true;
  });
  return allowed;
}

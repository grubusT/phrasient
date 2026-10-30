import { getDb } from './client';
import type { Trip } from './types';

export async function listTrips(): Promise<Trip[]> {
  const db = await getDb();
  return db.getAllAsync<Trip>('SELECT * FROM trips ORDER BY start_date DESC, created_at DESC');
}

export async function getTrip(tripId: number): Promise<Trip | null> {
  const db = await getDb();
  return db.getFirstAsync<Trip>('SELECT * FROM trips WHERE id = ?', tripId);
}

export async function createTrip(name: string, startDate: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO trips (name, start_date, created_at) VALUES (?, ?, ?)',
    name,
    startDate,
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export async function renameTrip(tripId: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE trips SET name = ? WHERE id = ?', name, tripId);
}

/** Pins and offline regions cascade; the caller is responsible for confirming first. */
export async function deleteTrip(tripId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM trips WHERE id = ?', tripId);
}

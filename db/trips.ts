import { getDb } from './client';
import type { Trip, Leg } from './types';

export interface NewLegInput {
  country_code: string;
  language_code: string;
  start_date: string;
  end_date: string;
}

export async function listTrips(): Promise<Trip[]> {
  const db = await getDb();
  return db.getAllAsync<Trip>('SELECT * FROM trips ORDER BY created_at DESC');
}

export async function getTrip(tripId: number): Promise<Trip | null> {
  const db = await getDb();
  return db.getFirstAsync<Trip>('SELECT * FROM trips WHERE id = ?', tripId);
}

export async function createTrip(name: string, legs: NewLegInput[]): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();

  let tripId = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      'INSERT INTO trips (name, created_at) VALUES (?, ?)',
      name,
      now
    );
    tripId = result.lastInsertRowId;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      await db.runAsync(
        'INSERT INTO legs (trip_id, country_code, language_code, start_date, end_date, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        tripId,
        leg.country_code,
        leg.language_code,
        leg.start_date,
        leg.end_date,
        i
      );
    }
  });

  return tripId;
}

export async function getLeg(legId: number): Promise<Leg | null> {
  const db = await getDb();
  return db.getFirstAsync<Leg>('SELECT * FROM legs WHERE id = ?', legId);
}

export async function listLegsForTrip(tripId: number): Promise<Leg[]> {
  const db = await getDb();
  return db.getAllAsync<Leg>(
    'SELECT * FROM legs WHERE trip_id = ? ORDER BY order_index ASC',
    tripId
  );
}

export async function getLegForDate(tripId: number, date: string): Promise<Leg | null> {
  const db = await getDb();
  return db.getFirstAsync<Leg>(
    'SELECT * FROM legs WHERE trip_id = ? AND start_date <= ? AND end_date >= ? ORDER BY order_index ASC LIMIT 1',
    tripId,
    date,
    date
  );
}

import { getDb } from './client';
import type { Stop, StopType } from './types';

export interface NewStopInput {
  leg_id: number;
  day_date: string;
  time: string | null;
  name: string;
  name_local: string | null;
  address: string | null;
  address_local: string | null;
  stop_type: StopType;
  notes: string | null;
}

export async function listStopsForDay(legId: number, date: string): Promise<Stop[]> {
  const db = await getDb();
  return db.getAllAsync<Stop>(
    'SELECT * FROM stops WHERE leg_id = ? AND day_date = ? ORDER BY order_index ASC, time ASC',
    legId,
    date
  );
}

export async function getStop(stopId: number): Promise<Stop | null> {
  const db = await getDb();
  return db.getFirstAsync<Stop>('SELECT * FROM stops WHERE id = ?', stopId);
}

export async function createStop(input: NewStopInput): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();

  const { maxOrder } = (await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(order_index) as maxOrder FROM stops WHERE leg_id = ? AND day_date = ?',
    input.leg_id,
    input.day_date
  )) ?? { maxOrder: null };
  const nextOrder = (maxOrder ?? -1) + 1;

  const result = await db.runAsync(
    `INSERT INTO stops
      (leg_id, day_date, time, name, name_local, address, address_local, stop_type, notes, order_index, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.leg_id,
    input.day_date,
    input.time,
    input.name,
    input.name_local,
    input.address,
    input.address_local,
    input.stop_type,
    input.notes,
    nextOrder,
    now
  );

  return result.lastInsertRowId;
}

export async function updateStop(stopId: number, input: NewStopInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE stops SET
      leg_id = ?, day_date = ?, time = ?, name = ?, name_local = ?,
      address = ?, address_local = ?, stop_type = ?, notes = ?
     WHERE id = ?`,
    input.leg_id,
    input.day_date,
    input.time,
    input.name,
    input.name_local,
    input.address,
    input.address_local,
    input.stop_type,
    input.notes,
    stopId
  );
}

export async function deleteStop(stopId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM stops WHERE id = ?', stopId);
}

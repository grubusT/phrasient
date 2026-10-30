import { getDb } from './client';
import { applyMove } from '../lib/trip';
import type { Pin, PinSource, StopType } from './types';

export interface NewPinInput {
  trip_id: number;
  day_date: string;
  display_name: string;
  official_name: string | null;
  official_address: string | null;
  name_en: string | null;
  address_en: string | null;
  country_code: string;
  stop_type: StopType;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  place_types: string[] | null;
  source: PinSource;
  time?: string | null;
  notes?: string | null;
}

export async function listPinsForTrip(tripId: number): Promise<Pin[]> {
  const db = await getDb();
  return db.getAllAsync<Pin>(
    'SELECT * FROM pins WHERE trip_id = ? ORDER BY day_date ASC, order_index ASC',
    tripId
  );
}

export async function listPinsForDay(tripId: number, dayDate: string): Promise<Pin[]> {
  const db = await getDb();
  return db.getAllAsync<Pin>(
    'SELECT * FROM pins WHERE trip_id = ? AND day_date = ? ORDER BY order_index ASC',
    tripId,
    dayDate
  );
}

/** Pins migrated from the v1 schema, which never stored coordinates. */
export async function listUnplacedPins(tripId: number): Promise<Pin[]> {
  const db = await getDb();
  return db.getAllAsync<Pin>(
    'SELECT * FROM pins WHERE trip_id = ? AND (lat IS NULL OR lng IS NULL) ORDER BY day_date ASC, order_index ASC',
    tripId
  );
}

export async function getPin(pinId: number): Promise<Pin | null> {
  const db = await getDb();
  return db.getFirstAsync<Pin>('SELECT * FROM pins WHERE id = ?', pinId);
}

export async function createPin(input: NewPinInput): Promise<number> {
  const db = await getDb();
  const { maxOrder } = (await db.getFirstAsync<{ maxOrder: number | null }>(
    'SELECT MAX(order_index) AS maxOrder FROM pins WHERE trip_id = ? AND day_date = ?',
    input.trip_id,
    input.day_date
  )) ?? { maxOrder: null };

  const result = await db.runAsync(
    `INSERT INTO pins (
      trip_id, day_date, order_index, display_name, official_name, official_address,
      name_en, address_en, country_code, stop_type, lat, lng, place_id, place_types,
      source, time, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.trip_id,
    input.day_date,
    (maxOrder ?? -1) + 1,
    input.display_name,
    input.official_name,
    input.official_address,
    input.name_en,
    input.address_en,
    input.country_code,
    input.stop_type,
    input.lat,
    input.lng,
    input.place_id,
    input.place_types ? JSON.stringify(input.place_types) : null,
    input.source,
    input.time ?? null,
    input.notes ?? null,
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

/** Only the display name is user-editable; provider text is left as it came. */
export async function renamePin(pinId: number, displayName: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE pins SET display_name = ? WHERE id = ?', displayName, pinId);
}

export async function setPinType(pinId: number, stopType: StopType): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE pins SET stop_type = ? WHERE id = ?', stopType, pinId);
}

/** Used when a migrated pin is finally located on the map. */
export async function setPinLocation(
  pinId: number,
  location: {
    lat: number;
    lng: number;
    place_id: string | null;
    place_types?: string[] | null;
    official_name?: string | null;
    official_address?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE pins SET lat = ?, lng = ?, place_id = ?, source = 'google',
       place_types = COALESCE(?, place_types),
       official_name = COALESCE(?, official_name),
       official_address = COALESCE(?, official_address)
     WHERE id = ?`,
    location.lat,
    location.lng,
    location.place_id,
    location.place_types ? JSON.stringify(location.place_types) : null,
    location.official_name ?? null,
    location.official_address ?? null,
    pinId
  );
}

export async function deletePin(pinId: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const pin = await db.getFirstAsync<Pin>('SELECT * FROM pins WHERE id = ?', pinId);
    if (!pin) return;
    await db.runAsync('DELETE FROM pins WHERE id = ?', pinId);
    await db.runAsync(
      'UPDATE pins SET order_index = order_index - 1 WHERE trip_id = ? AND day_date = ? AND order_index > ?',
      pin.trip_id,
      pin.day_date,
      pin.order_index
    );
  });
}

/**
 * Moves a pin within its day or to another day.
 *
 * `targetIndex` is the position in the destination day *after* the pin has been
 * taken out of its original place, which is the index drag-and-drop reports.
 * The new order comes from `applyMove`, the same function the sheet uses to
 * show the move before this resolves, so the two cannot disagree.
 */
export async function movePin(pinId: number, targetDay: string, targetIndex: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const pin = await db.getFirstAsync<Pin>('SELECT * FROM pins WHERE id = ?', pinId);
    if (!pin) return;

    const before = await db.getAllAsync<Pin>('SELECT * FROM pins WHERE trip_id = ?', pin.trip_id);
    const after = applyMove(before, pinId, targetDay, targetIndex);
    for (const [i, p] of after.entries()) {
      const old = before[i];
      if (p.day_date === old.day_date && p.order_index === old.order_index) continue;
      await db.runAsync(
        'UPDATE pins SET day_date = ?, order_index = ? WHERE id = ?',
        p.day_date,
        p.order_index,
        p.id
      );
    }
  });
}

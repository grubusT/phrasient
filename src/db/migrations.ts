import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema history. Each entry is applied in order, in a transaction, and the
 * resulting `user_version` is the highest entry applied.
 *
 * Statements are kept as plain SQL so the same array can be replayed against a
 * stock SQLite in tests — see tests/migration.test.ts.
 */
export interface Migration {
  version: number;
  statements: string[];
}

/** v1: the original leg/stop itinerary model. Reproduced verbatim so that a
 *  fresh install reaches the same state an upgrading install migrates from. */
const V1: Migration = {
  version: 1,
  statements: [
    `CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS legs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      country_code TEXT NOT NULL,
      language_code TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      order_index INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leg_id INTEGER NOT NULL REFERENCES legs(id) ON DELETE CASCADE,
      day_date TEXT NOT NULL,
      time TEXT,
      name TEXT NOT NULL,
      name_local TEXT,
      address TEXT,
      address_local TEXT,
      stop_type TEXT NOT NULL,
      notes TEXT,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_legs_trip ON legs(trip_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stops_leg_day ON stops(leg_id, day_date)`,
  ],
};

/**
 * v2: map-first model. Legs are gone; a trip is an ordered list of pins grouped
 * by day, and the phrase language is derived per-pin from its country.
 *
 * Existing data is carried across, not rebuilt: every stop becomes a pin, and
 * the v1 tables are renamed rather than dropped so nothing is unrecoverable if
 * the new model turns out to be wrong. A later version can drop the backups.
 */
const V2: Migration = {
  version: 2,
  statements: [
    `ALTER TABLE trips ADD COLUMN start_date TEXT`,

    `CREATE TABLE pins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      day_date TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      display_name TEXT NOT NULL,
      official_name TEXT,
      official_address TEXT,
      name_en TEXT,
      address_en TEXT,
      country_code TEXT NOT NULL,
      stop_type TEXT NOT NULL,
      lat REAL,
      lng REAL,
      place_id TEXT,
      place_types TEXT,
      source TEXT NOT NULL,
      time TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_pins_trip_day ON pins(trip_id, day_date, order_index)`,

    `CREATE TABLE pinned_phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_code TEXT NOT NULL,
      phrase_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(language_code, phrase_id)
    )`,

    `CREATE TABLE place_details_cache (
      place_id TEXT NOT NULL,
      language_code TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (place_id, language_code)
    )`,

    `CREATE TABLE offline_regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      min_lon REAL NOT NULL,
      min_lat REAL NOT NULL,
      max_lon REAL NOT NULL,
      max_lat REAL NOT NULL,
      min_zoom INTEGER NOT NULL,
      max_zoom INTEGER NOT NULL,
      tile_count INTEGER NOT NULL,
      byte_size INTEGER NOT NULL,
      file_path TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX idx_offline_regions_trip ON offline_regions(trip_id)`,

    // A trip's day 1 is the earliest day any of its legs covered.
    `UPDATE trips SET start_date = (
      SELECT MIN(l.start_date) FROM legs l WHERE l.trip_id = trips.id
    )`,

    // Stops become pins, re-ranked by day then time. Untimed stops keep their
    // manual order and fall to the end of their day. Partitioning by day rather
    // than by leg merges two legs that shared a date into one ordered day.
    `INSERT INTO pins (
      trip_id, day_date, order_index, display_name, official_name, official_address,
      name_en, address_en, country_code, stop_type, lat, lng, place_id, place_types,
      source, time, notes, created_at
    )
    SELECT
      l.trip_id,
      s.day_date,
      ROW_NUMBER() OVER (
        PARTITION BY l.trip_id, s.day_date
        ORDER BY COALESCE(s.time, '99:99'), s.order_index, s.id
      ) - 1,
      s.name,
      s.name_local,
      s.address_local,
      s.name,
      s.address,
      l.country_code,
      s.stop_type,
      NULL, NULL, NULL, NULL,
      'manual',
      s.time,
      s.notes,
      s.created_at
    FROM stops s
    JOIN legs l ON l.id = s.leg_id`,

    `DROP INDEX IF EXISTS idx_stops_leg_day`,
    `DROP INDEX IF EXISTS idx_legs_trip`,
    `ALTER TABLE stops RENAME TO stops_v1_backup`,
    `ALTER TABLE legs RENAME TO legs_v1_backup`,
  ],
};

export const MIGRATIONS: Migration[] = [V1, V2];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/** Applies every migration newer than the database's current `user_version`. */
export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  await db.execAsync('PRAGMA journal_mode = WAL');

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
    });
    // PRAGMA cannot be parameterised, and the value is a literal from this file.
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}

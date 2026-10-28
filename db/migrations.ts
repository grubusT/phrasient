import type { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 1;

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS legs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      country_code TEXT NOT NULL,
      language_code TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stops (
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
    );

    CREATE INDEX IF NOT EXISTS idx_legs_trip ON legs(trip_id);
    CREATE INDEX IF NOT EXISTS idx_stops_leg_day ON stops(leg_id, day_date);
  `);

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

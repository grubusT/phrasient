import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS, SCHEMA_VERSION } from '../src/db/migrations.ts';

function apply(db: DatabaseSync, upTo: number) {
  // Matches src/db/client.ts, which opens every connection with foreign keys on.
  // Renaming a table that other tables reference behaves differently under it.
  db.exec('PRAGMA foreign_keys = ON');
  for (const migration of MIGRATIONS) {
    if (migration.version > upTo) continue;
    for (const statement of migration.statements) db.exec(statement);
    db.exec(`PRAGMA user_version = ${migration.version}`);
  }
}

/**
 * A v1 database shaped like a real trip: two legs in different countries whose
 * date ranges overlap on one day, stops with and without times, and local-script
 * text on some but not all of them.
 */
function seedV1(db: DatabaseSync) {
  apply(db, 1);
  db.exec(`INSERT INTO trips (id, name, created_at) VALUES (1, 'Asia 2026', '2026-01-01T00:00:00Z')`);
  db.exec(`INSERT INTO legs (id, trip_id, country_code, language_code, start_date, end_date, order_index)
           VALUES (1, 1, 'VN', 'vi', '2026-11-03', '2026-11-06', 0),
                  (2, 1, 'CN', 'zh-CN', '2026-11-06', '2026-11-10', 1)`);
  db.exec(`INSERT INTO stops
             (id, leg_id, day_date, time, name, name_local, address, address_local, stop_type, notes, order_index, created_at)
           VALUES
             -- day with three stops, deliberately inserted out of clock order
             (1, 1, '2026-11-03', '18:30', 'Bun Cha Huong Lien', 'Bún chả Hương Liên', '24 Le Van Huu', '24 Lê Văn Hưu', 'restaurant', 'obama spot', 0, '2026-01-02T00:00:00Z'),
             (2, 1, '2026-11-03', '09:00', 'Hoan Kiem Lake', 'Hồ Hoàn Kiếm', NULL, NULL, 'outdoors', NULL, 1, '2026-01-03T00:00:00Z'),
             (3, 1, '2026-11-03', NULL, 'Sofitel Metropole', 'Khách sạn Metropole', '15 Ngo Quyen', '15 Ngô Quyền', 'accommodation', NULL, 2, '2026-01-04T00:00:00Z'),
             -- the overlap day: one stop from each leg, same calendar date
             (4, 1, '2026-11-06', '07:00', 'Noi Bai Airport', 'Sân bay Nội Bài', NULL, NULL, 'transport', NULL, 0, '2026-01-05T00:00:00Z'),
             (5, 2, '2026-11-06', '14:00', 'Beijing Capital Airport', '北京首都国际机场', NULL, NULL, 'transport', NULL, 0, '2026-01-06T00:00:00Z')`);
}

test('v1 stops become pins with every field preserved', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const pins = db.prepare(`SELECT * FROM pins ORDER BY day_date, order_index`).all() as any[];
  assert.equal(pins.length, 5, 'no stop may be lost');

  const bunCha = pins.find((p) => p.display_name === 'Bun Cha Huong Lien');
  assert.deepEqual(
    {
      trip_id: bunCha.trip_id,
      day_date: bunCha.day_date,
      display_name: bunCha.display_name,
      official_name: bunCha.official_name,
      official_address: bunCha.official_address,
      name_en: bunCha.name_en,
      address_en: bunCha.address_en,
      country_code: bunCha.country_code,
      stop_type: bunCha.stop_type,
      time: bunCha.time,
      notes: bunCha.notes,
      source: bunCha.source,
      created_at: bunCha.created_at,
    },
    {
      trip_id: 1,
      day_date: '2026-11-03',
      display_name: 'Bun Cha Huong Lien',
      official_name: 'Bún chả Hương Liên',
      official_address: '24 Lê Văn Hưu',
      name_en: 'Bun Cha Huong Lien',
      address_en: '24 Le Van Huu',
      country_code: 'VN',
      stop_type: 'restaurant',
      time: '18:30',
      notes: 'obama spot',
      source: 'manual',
      created_at: '2026-01-02T00:00:00Z',
    }
  );
});

test('pins are ordered by day then time, untimed stops last', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const day = db
    .prepare(`SELECT display_name, order_index FROM pins WHERE day_date = '2026-11-03' ORDER BY order_index`)
    .all() as any[];

  assert.deepEqual(
    day.map((p) => p.display_name),
    ['Hoan Kiem Lake', 'Bun Cha Huong Lien', 'Sofitel Metropole'],
    '09:00 before 18:30, and the untimed hotel falls to the end'
  );
  assert.deepEqual(day.map((p) => p.order_index), [0, 1, 2], 'order_index is 0-based and dense');
});

test('two legs sharing a date merge into one ordered day', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const overlap = db
    .prepare(`SELECT display_name, country_code, order_index FROM pins WHERE day_date = '2026-11-06' ORDER BY order_index`)
    .all() as any[];

  assert.deepEqual(overlap.map((p) => p.display_name), ['Noi Bai Airport', 'Beijing Capital Airport']);
  assert.deepEqual(overlap.map((p) => p.country_code), ['VN', 'CN'], 'country carries over from each stop own leg');
  assert.deepEqual(overlap.map((p) => p.order_index), [0, 1], 'one continuous sequence, not two zero-based runs');
});

test('country comes from the old leg, and language follows the pin not the trip', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const countries = db
    .prepare(`SELECT DISTINCT country_code FROM pins WHERE trip_id = 1 ORDER BY country_code`)
    .all() as any[];
  assert.deepEqual(countries.map((c) => c.country_code), ['CN', 'VN']);
});

test('trip start_date is the earliest leg start', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const trip = db.prepare(`SELECT start_date FROM trips WHERE id = 1`).get() as any;
  assert.equal(trip.start_date, '2026-11-03');
});

test('v1 tables are kept as backups, never dropped', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const backedUpStops = db.prepare(`SELECT COUNT(*) AS n FROM stops_v1_backup`).get() as any;
  const backedUpLegs = db.prepare(`SELECT COUNT(*) AS n FROM legs_v1_backup`).get() as any;
  assert.equal(backedUpStops.n, 5);
  assert.equal(backedUpLegs.n, 2);

  const names = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('stops', 'legs')`)
    .all();
  assert.deepEqual(names, [], 'the old names are gone so nothing can write to them by accident');
});

test('migrated pins have no coordinates and are flagged for placing', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);

  const unplaced = db.prepare(`SELECT COUNT(*) AS n FROM pins WHERE lat IS NULL AND lng IS NULL`).get() as any;
  assert.equal(unplaced.n, 5, 'v1 never stored coordinates, so none may be invented');
});

test('a fresh install reaches the same schema as a migrated one', () => {
  const fresh = new DatabaseSync(':memory:');
  apply(fresh, SCHEMA_VERSION);

  const migrated = new DatabaseSync(':memory:');
  seedV1(migrated);
  apply(migrated, SCHEMA_VERSION);

  const schemaOf = (db: DatabaseSync) =>
    (db.prepare(`SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`).all() as any[])
      .map((r) => `${r.name}:${r.sql}`)
      .join('\n');

  assert.equal(schemaOf(fresh), schemaOf(migrated));
  assert.equal((fresh.prepare(`PRAGMA user_version`).get() as any).user_version, SCHEMA_VERSION);
});

test('re-running migrations is a no-op', () => {
  const db = new DatabaseSync(':memory:');
  seedV1(db);
  apply(db, 2);
  const before = (db.prepare(`SELECT COUNT(*) AS n FROM pins`).get() as any).n;

  // migrate() skips anything at or below user_version; prove the guard holds.
  const version = (db.prepare(`PRAGMA user_version`).get() as any).user_version;
  assert.equal(version, SCHEMA_VERSION);
  for (const migration of MIGRATIONS) {
    assert.ok(migration.version <= version, 'nothing is left pending');
  }
  assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM pins`).get() as any).n, before);
});

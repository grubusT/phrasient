import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentOrNextPin,
  groupPinsByDay,
  pickActiveTrip,
  pinBounds,
  tripOrderNumbers,
} from '../src/lib/trip.ts';
import type { Pin, Trip } from '../src/db/types.ts';

function pin(partial: Partial<Pin> & { id: number; day_date: string; order_index: number }): Pin {
  return {
    trip_id: 1,
    display_name: `Pin ${partial.id}`,
    official_name: null,
    official_address: null,
    name_en: null,
    address_en: null,
    country_code: 'VN',
    stop_type: 'other',
    lat: null,
    lng: null,
    place_id: null,
    place_types: null,
    source: 'manual',
    time: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

function trip(id: number, start_date: string | null): Trip {
  return { id, name: `Trip ${id}`, start_date, created_at: '2026-01-01T00:00:00Z' };
}

test('days come back in date order with each day internally ordered', () => {
  const days = groupPinsByDay([
    pin({ id: 3, day_date: '2026-11-04', order_index: 1 }),
    pin({ id: 1, day_date: '2026-11-03', order_index: 1 }),
    pin({ id: 2, day_date: '2026-11-04', order_index: 0 }),
    pin({ id: 4, day_date: '2026-11-03', order_index: 0 }),
  ]);

  assert.deepEqual(days.map((d) => d.date), ['2026-11-03', '2026-11-04']);
  assert.deepEqual(days.map((d) => d.pins.map((p) => p.id)), [[4, 1], [2, 3]]);
});

test('pin numbers run continuously across days, not restarting each day', () => {
  const numbers = tripOrderNumbers([
    pin({ id: 10, day_date: '2026-11-03', order_index: 0 }),
    pin({ id: 11, day_date: '2026-11-03', order_index: 1 }),
    pin({ id: 12, day_date: '2026-11-04', order_index: 0 }),
  ]);

  assert.deepEqual([...numbers.entries()], [[10, 1], [11, 2], [12, 3]]);
});

test('the active trip is the one covering today', () => {
  const trips = [trip(1, '2026-01-01'), trip(2, '2026-11-01'), trip(3, '2027-05-01')];
  assert.equal(pickActiveTrip(trips, '2026-11-05')?.id, 2, 'the most recently started trip');
});

test('before any trip starts, the next one is active', () => {
  const trips = [trip(2, '2026-11-01'), trip(3, '2027-05-01')];
  assert.equal(pickActiveTrip(trips, '2026-01-01')?.id, 2);
});

test('an undated trip is still offered rather than showing nothing', () => {
  assert.equal(pickActiveTrip([trip(7, null)], '2026-11-05')?.id, 7);
  assert.equal(pickActiveTrip([], '2026-11-05'), null);
});

test("the peek sheet shows today's next pin by the clock", () => {
  const pins = [
    pin({ id: 1, day_date: '2026-11-03', order_index: 0, time: '09:00' }),
    pin({ id: 2, day_date: '2026-11-03', order_index: 1, time: '13:00' }),
    pin({ id: 3, day_date: '2026-11-03', order_index: 2, time: '19:00' }),
  ];
  assert.equal(currentOrNextPin(pins, '2026-11-03', '11:30')?.id, 2);
  assert.equal(currentOrNextPin(pins, '2026-11-03', '20:00')?.id, 1, 'past the last pin, fall back to the day');
});

test('on a day with no pins, the peek sheet looks ahead', () => {
  const pins = [
    pin({ id: 1, day_date: '2026-11-03', order_index: 0 }),
    pin({ id: 2, day_date: '2026-11-07', order_index: 0 }),
  ];
  assert.equal(currentOrNextPin(pins, '2026-11-05')?.id, 2);
  assert.equal(currentOrNextPin(pins, '2026-11-09')?.id, 2, 'after the trip, hold on the last pin');
  assert.equal(currentOrNextPin([], '2026-11-05'), null);
});

test('bounds cover every placed pin and ignore unplaced ones', () => {
  const bounds = pinBounds(
    [
      pin({ id: 1, day_date: '2026-11-03', order_index: 0, lat: 21.0, lng: 105.8 }),
      pin({ id: 2, day_date: '2026-11-03', order_index: 1, lat: 21.1, lng: 105.9 }),
      pin({ id: 3, day_date: '2026-11-03', order_index: 2 }), // migrated, no coordinates
    ],
    0
  );
  assert.deepEqual(bounds, [105.8, 21.0, 105.9, 21.1]);
  assert.equal(pinBounds([pin({ id: 9, day_date: '2026-11-03', order_index: 0 })]), null);
});

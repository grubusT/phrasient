import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMove,
  currentOrNextPin,
  dropTarget,
  defaultDayForNewPin,
  groupPinsByDay,
  pickActiveTrip,
  pinBounds,
  sheetRows,
  tripDays,
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

test('a new pin can go on any day through the last pinned one, plus one more', () => {
  const pins = [pin({ id: 1, day_date: '2026-11-04', order_index: 0 })];
  assert.deepEqual(tripDays(trip(1, '2026-11-02'), pins), [
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
  ]);
});

test('an empty trip offers its first day and the next', () => {
  assert.deepEqual(tripDays(trip(1, '2026-12-31'), []), ['2026-12-31', '2027-01-01']);
  assert.deepEqual(tripDays(trip(1, null), [], '2026-10-30'), ['2026-10-30', '2026-10-31']);
});

test('new pins default to the last day that has pins', () => {
  const days = ['2026-11-02', '2026-11-03', '2026-11-04'];
  const pins = [
    pin({ id: 1, day_date: '2026-11-02', order_index: 0 }),
    pin({ id: 2, day_date: '2026-11-03', order_index: 0 }),
  ];
  assert.equal(defaultDayForNewPin(days, pins), '2026-11-03');
  assert.equal(defaultDayForNewPin(days, []), '2026-11-02');
});

// Two days of pins: 1, 2, 3 on the 3rd and 4, 5 on the 4th.
const twoDays = () => [
  pin({ id: 1, day_date: '2026-11-03', order_index: 0 }),
  pin({ id: 2, day_date: '2026-11-03', order_index: 1 }),
  pin({ id: 3, day_date: '2026-11-03', order_index: 2 }),
  pin({ id: 4, day_date: '2026-11-04', order_index: 0 }),
  pin({ id: 5, day_date: '2026-11-04', order_index: 1 }),
];

const layout = (pins: Pin[]) =>
  groupPinsByDay(pins).map((d) => [d.date, d.pins.map((p) => [p.id, p.order_index])]);

test('moving a pin later in its day shifts the ones it passes', () => {
  assert.deepEqual(layout(applyMove(twoDays(), 1, '2026-11-03', 2)), [
    ['2026-11-03', [[2, 0], [3, 1], [1, 2]]],
    ['2026-11-04', [[4, 0], [5, 1]]],
  ]);
});

test('moving a pin to another day closes the gap and opens one', () => {
  assert.deepEqual(layout(applyMove(twoDays(), 2, '2026-11-04', 1)), [
    ['2026-11-03', [[1, 0], [3, 1]]],
    ['2026-11-04', [[4, 0], [2, 1], [5, 2]]],
  ]);
});

test('a pin can be moved onto an empty day', () => {
  assert.deepEqual(layout(applyMove(twoDays(), 5, '2026-11-05', 0)), [
    ['2026-11-03', [[1, 0], [2, 1], [3, 2]]],
    ['2026-11-04', [[4, 0]]],
    ['2026-11-05', [[5, 0]]],
  ]);
});

test('an index past the end of a day appends', () => {
  assert.deepEqual(layout(applyMove(twoDays(), 1, '2026-11-04', 99))[1], [
    '2026-11-04',
    [[4, 0], [5, 1], [1, 2]],
  ]);
});

test('the sheet lists every trip day, empty ones included', () => {
  const rows = sheetRows(trip(1, '2026-11-02'), twoDays(), '2026-01-01');
  assert.deepEqual(
    rows.map((r) => (r.kind === 'day' ? `day ${r.dayNumber}${r.empty ? ' empty' : ''}` : r.pin.id)),
    ['day 1 empty', 'day 2', 1, 2, 3, 'day 3', 4, 5, 'day 4 empty']
  );
});

test('pins dated before the trip start still get a day', () => {
  const rows = sheetRows(trip(1, '2026-11-04'), twoDays(), '2026-01-01');
  assert.equal(rows[0].kind === 'day' && rows[0].date, '2026-11-03');
});

// Rows: 0 day 3rd, 1 pin1, 2 pin2, 3 pin3, 4 day 4th, 5 pin4, 6 pin5, 7 day 5th (empty)
const rowsFor = () => sheetRows(trip(1, '2026-11-03'), twoDays(), '2026-01-01');

test('dragging within a day reports the new position in that day', () => {
  assert.deepEqual(dropTarget(rowsFor(), 1, 3), { pinId: 1, day: '2026-11-03', index: 2 });
});

test('dragging past a day header moves the pin to that day', () => {
  assert.deepEqual(dropTarget(rowsFor(), 3, 4), { pinId: 3, day: '2026-11-04', index: 0 });
  assert.deepEqual(dropTarget(rowsFor(), 6, 4), { pinId: 5, day: '2026-11-03', index: 3 });
});

test('dragging to the end lands on the empty trailing day', () => {
  assert.deepEqual(dropTarget(rowsFor(), 2, 7), { pinId: 2, day: '2026-11-05', index: 0 });
});

test('dragging above the first header lands first on day 1', () => {
  assert.deepEqual(dropTarget(rowsFor(), 5, 0), { pinId: 4, day: '2026-11-03', index: 0 });
});

test('day headers cannot be dragged', () => {
  assert.equal(dropTarget(rowsFor(), 0, 2), null);
});

test('a drop target applied as a move gives the order the list showed', () => {
  const pins = twoDays();
  const t = dropTarget(rowsFor(), 6, 2)!; // pin 5 between pins 1 and 2
  assert.deepEqual(layout(applyMove(pins, t.pinId, t.day, t.index)), [
    ['2026-11-03', [[1, 0], [5, 1], [2, 2], [3, 3]]],
    ['2026-11-04', [[4, 0]]],
  ]);
});

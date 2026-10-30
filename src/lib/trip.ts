import type { Pin, Trip } from '../db/types';
import { addDaysISO, todayISO } from './date';

export interface Day {
  date: string;
  pins: Pin[];
}

/** Groups a trip's pins into days, in date order, preserving each day's order. */
export function groupPinsByDay(pins: Pin[]): Day[] {
  const byDate = new Map<string, Pin[]>();
  for (const pin of pins) {
    const day = byDate.get(pin.day_date);
    if (day) day.push(pin);
    else byDate.set(pin.day_date, [pin]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayPins]) => ({
      date,
      pins: [...dayPins].sort((a, b) => a.order_index - b.order_index),
    }));
}

/**
 * Pins are numbered across the whole trip in order, so pin 1 on day 1 and the
 * first pin of day 2 continue the same sequence.
 */
export function tripOrderNumbers(pins: Pin[]): Map<number, number> {
  const numbers = new Map<number, number>();
  let n = 1;
  for (const day of groupPinsByDay(pins)) {
    for (const pin of day.pins) numbers.set(pin.id, n++);
  }
  return numbers;
}

/**
 * Days a new pin can go on: every day from the trip's start through its last
 * pinned day, plus one more so the trip can grow. A trip with no start date
 * starts today.
 */
export function tripDays(trip: Trip, pins: Pin[], today = todayISO()): string[] {
  const start = trip.start_date ?? today;
  const last = pins.reduce((max, p) => (p.day_date > max ? p.day_date : max), start);
  const days = [start];
  while (days[days.length - 1] <= last) days.push(addDaysISO(days[days.length - 1], 1));
  return days;
}

/** New pins land on the last day that already has pins, else day 1. */
export function defaultDayForNewPin(days: string[], pins: Pin[]): string {
  const pinned = days.filter((d) => pins.some((p) => p.day_date === d));
  return pinned[pinned.length - 1] ?? days[0];
}

/** The trip the map should open on: the one covering today, else the next one, else the last. */
export function pickActiveTrip(trips: Trip[], today = todayISO()): Trip | null {
  if (trips.length === 0) return null;
  const dated = trips.filter((t) => t.start_date);
  const upcoming = dated
    .filter((t) => t.start_date! >= today)
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!));
  const started = dated
    .filter((t) => t.start_date! <= today)
    .sort((a, b) => b.start_date!.localeCompare(a.start_date!));
  return started[0] ?? upcoming[0] ?? trips[0];
}

/**
 * What the peek sheet shows: today's next pin by clock time, falling back to
 * today's first pin, then to the trip's next upcoming pin.
 */
export function currentOrNextPin(pins: Pin[], today = todayISO(), nowHHMM?: string): Pin | null {
  const sorted = groupPinsByDay(pins).flatMap((d) => d.pins);
  if (sorted.length === 0) return null;

  const todaysPins = sorted.filter((p) => p.day_date === today);
  if (todaysPins.length > 0) {
    if (nowHHMM) {
      const next = todaysPins.find((p) => p.time !== null && p.time >= nowHHMM);
      if (next) return next;
    }
    return todaysPins[0];
  }
  return sorted.find((p) => p.day_date > today) ?? sorted[sorted.length - 1];
}

/** West, south, east, north — the order MapLibre's camera expects. */
export type Bounds = [west: number, south: number, east: number, north: number];

/** Bounding box of the placed pins, padded slightly so markers are not clipped. */
export function pinBounds(pins: Pin[], padding = 0.01): Bounds | null {
  const placed = pins.filter((p) => p.lat !== null && p.lng !== null);
  if (placed.length === 0) return null;

  const lats = placed.map((p) => p.lat!);
  const lngs = placed.map((p) => p.lng!);
  return [
    Math.min(...lngs) - padding,
    Math.min(...lats) - padding,
    Math.max(...lngs) + padding,
    Math.max(...lats) + padding,
  ];
}

/**
 * Moves a pin within its day or to another day and returns the trip's pins with
 * dense 0-based order within every day. Mirrors `movePin` in `src/db/pins.ts`:
 * `targetIndex` is the position in the target day after the pin is taken out.
 */
export function applyMove(pins: Pin[], pinId: number, targetDay: string, targetIndex: number): Pin[] {
  const moving = pins.find((p) => p.id === pinId);
  if (!moving) return pins;

  const target = groupPinsByDay(pins.filter((p) => p.id !== pinId)).find((d) => d.date === targetDay);
  const targetPins = target ? [...target.pins] : [];
  const index = Math.max(0, Math.min(targetIndex, targetPins.length));
  targetPins.splice(index, 0, { ...moving, day_date: targetDay });

  const reordered = new Map<number, Pin>();
  targetPins.forEach((p, i) => reordered.set(p.id, { ...p, order_index: i }));
  if (moving.day_date !== targetDay) {
    const source = groupPinsByDay(pins).find((d) => d.date === moving.day_date)!;
    source.pins
      .filter((p) => p.id !== pinId)
      .forEach((p, i) => reordered.set(p.id, { ...p, order_index: i }));
  }
  return pins.map((p) => reordered.get(p.id) ?? p);
}

/** A row in the sheet's day list. Day headers are rows too, so a pin can be dragged past them. */
export type SheetRow =
  | { kind: 'day'; date: string; dayNumber: number; empty: boolean }
  | { kind: 'pin'; pin: Pin };

/**
 * The sheet's flat list: every trip day, empty ones included so a pin can be
 * dragged onto them, each followed by its pins. Pins on a day outside
 * `tripDays` (before the start date) still get a header rather than vanishing.
 */
export function sheetRows(trip: Trip, pins: Pin[], today = todayISO()): SheetRow[] {
  const byDay = new Map(groupPinsByDay(pins).map((d) => [d.date, d.pins]));
  const dates = [...new Set([...tripDays(trip, pins, today), ...byDay.keys()])].sort();

  return dates.flatMap((date, i): SheetRow[] => {
    const dayPins = byDay.get(date) ?? [];
    return [
      { kind: 'day', date, dayNumber: i + 1, empty: dayPins.length === 0 },
      ...dayPins.map((pin) => ({ kind: 'pin' as const, pin })),
    ];
  });
}

/**
 * Where a drag from row `from` to row `to` puts the pin: the day of the nearest
 * header above it and its position among that day's pins. A pin dropped above
 * every header lands first on the first day. Null when the dragged row is not a pin.
 */
export function dropTarget(
  rows: SheetRow[],
  from: number,
  to: number
): { pinId: number; day: string; index: number } | null {
  const dragged = rows[from];
  if (!dragged || dragged.kind !== 'pin') return null;

  const after = [...rows];
  after.splice(from, 1);
  after.splice(to, 0, dragged);

  let index = 0;
  for (let i = to - 1; i >= 0; i--) {
    const row = after[i];
    if (row.kind === 'day') return { pinId: dragged.pin.id, day: row.date, index };
    index++;
  }
  const firstDay = after.find((r) => r.kind === 'day');
  return firstDay?.kind === 'day' ? { pinId: dragged.pin.id, day: firstDay.date, index: 0 } : null;
}

/**
 * The pin before this one in trip order, crossing day boundaries. A move is the
 * gap between the two and is never stored, so this is its only definition.
 */
export function previousPin(pins: Pin[], pinId: number): Pin | null {
  const ordered = groupPinsByDay(pins).flatMap((d) => d.pins);
  const i = ordered.findIndex((p) => p.id === pinId);
  return i > 0 ? ordered[i - 1] : null;
}

/**
 * The map's connector: one straight segment per move whose two ends are both on
 * the map, as `[lng, lat]` pairs. A move into or out of an unplaced pin draws
 * nothing, rather than a line that skips it and suggests a move that is not in
 * the trip. Straight on purpose: pins are joined by order, never by roads.
 */
export function connectorSegments(pins: Pin[]): [number, number][][] {
  const ordered = groupPinsByDay(pins).flatMap((d) => d.pins);
  const segments: [number, number][][] = [];
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1];
    const b = ordered[i];
    if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) continue;
    segments.push([
      [a.lng, a.lat],
      [b.lng, b.lat],
    ]);
  }
  return segments;
}

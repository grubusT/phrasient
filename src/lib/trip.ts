import type { Pin, Trip } from '../db/types';
import { todayISO } from './date';

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

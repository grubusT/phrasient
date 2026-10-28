export type StopType =
  | 'transport'
  | 'accommodation'
  | 'restaurant'
  | 'market'
  | 'attraction'
  | 'nightlife'
  | 'outdoors'
  | 'other';

export interface Trip {
  id: number;
  name: string;
  created_at: string;
}

export interface Leg {
  id: number;
  trip_id: number;
  country_code: string;
  language_code: string;
  start_date: string; // ISO date, e.g. 2026-11-03
  end_date: string;
  order_index: number;
}

export interface Stop {
  id: number;
  leg_id: number;
  day_date: string; // ISO date
  time: string | null; // HH:MM
  name: string;
  name_local: string | null;
  address: string | null;
  address_local: string | null;
  stop_type: StopType;
  notes: string | null;
  order_index: number;
  created_at: string;
}

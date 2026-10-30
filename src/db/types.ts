export type StopType =
  | 'transport'
  | 'accommodation'
  | 'restaurant'
  | 'market'
  | 'attraction'
  | 'nightlife'
  | 'outdoors'
  | 'other';

/** Where a pin's details came from. Google pins carry official local-script text. */
export type PinSource = 'google' | 'manual';

export interface Trip {
  id: number;
  name: string;
  start_date: string | null; // ISO date of day 1
  created_at: string;
}

export interface Pin {
  id: number;
  trip_id: number;
  day_date: string; // ISO date
  order_index: number; // position within the day

  /** User-editable label. Everything else below is provider data and is left alone. */
  display_name: string;
  official_name: string | null; // local script, as the country writes it
  official_address: string | null; // local script
  name_en: string | null;
  address_en: string | null;

  country_code: string; // ISO-3166-1 alpha-2, derives the phrase language
  stop_type: StopType;

  // Null for pins migrated from v1, which predate coordinates.
  lat: number | null;
  lng: number | null;

  place_id: string | null;
  place_types: string | null; // JSON array of raw provider types
  source: PinSource;

  time: string | null; // HH:MM
  notes: string | null;
  created_at: string;
}

export interface PinnedPhrase {
  id: number;
  language_code: string;
  phrase_id: string;
  created_at: string;
}

export type OfflineRegionStatus = 'downloading' | 'ready' | 'failed';

export interface OfflineRegion {
  id: number;
  trip_id: number;
  name: string;
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
  min_zoom: number;
  max_zoom: number;
  tile_count: number;
  byte_size: number;
  file_path: string | null; // relative to the documents directory
  status: OfflineRegionStatus;
  created_at: string;
}

import type { StopType } from '../db/types';

/**
 * Provider-agnostic place search, so Google can be swapped for another provider
 * and tests never touch the network. See src/places/index.ts for selection.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  providerId: string;
  primaryText: string;
  secondaryText: string;
}

export interface PlaceRecord {
  providerId: string;
  nameEn: string;
  nameLocal: string | null; // official name in local script; null when we have no pack for the country
  addressEn: string | null;
  addressLocal: string | null;
  localLanguage: string | null; // BCP-47 the local fields are in
  countryCode: string; // ISO-3166-1 alpha-2
  lat: number;
  lng: number;
  stopType: StopType;
  providerTypes: string[];
}

export interface PlaceSearch {
  suggest(
    query: string,
    options: { session: string; near?: LatLng; signal?: AbortSignal }
  ): Promise<PlaceSuggestion[]>;
  details(providerId: string, options: { session: string }): Promise<PlaceRecord>;
}

/**
 * Every failure a screen has to explain. Each kind gets its own copy, so the user
 * is never left with a silent empty list.
 */
export type PlacesErrorKind = 'offline' | 'timeout' | 'quota' | 'denied' | 'unknown';

export class PlacesError extends Error {
  readonly kind: PlacesErrorKind;

  constructor(kind: PlacesErrorKind, message: string) {
    super(message);
    this.name = 'PlacesError';
    this.kind = kind;
  }
}

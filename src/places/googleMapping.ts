import { PlacesError, type PlaceRecord, type PlaceSuggestion } from './types';
import { stopTypeFromPlaceTypes } from './stopTypeFromPlaceTypes';

/** The subset of a Places API (New) `Place` that our field masks request. */
export interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
}

export interface GoogleAutocompleteResponse {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
    };
  }[];
}

/** Only place predictions are useful for adding a pin; query predictions are dropped. */
export function toSuggestions(response: GoogleAutocompleteResponse): PlaceSuggestion[] {
  return (response.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p
      ? [
          {
            providerId: p.placeId,
            primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
            secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
          },
        ]
      : []
  );
}

export function countryFromPlace(place: GooglePlace): string | null {
  const country = place.addressComponents?.find((c) => c.types.includes('country'));
  return country ? country.shortText.toUpperCase() : null;
}

/**
 * Combines the English response with the local-language one. `local` is null when
 * the country has no phrase pack, so the pin carries no local script.
 */
export function toPlaceRecord(
  en: GooglePlace,
  local: GooglePlace | null,
  localLanguage: string | null
): PlaceRecord {
  const countryCode = countryFromPlace(en);
  if (!countryCode || !en.location) {
    throw new PlacesError('unknown', 'This place has no country or location, so it cannot be pinned.');
  }
  const types = en.types ?? [];
  return {
    providerId: en.id,
    nameEn: en.displayName?.text ?? en.formattedAddress ?? en.id,
    nameLocal: local?.displayName?.text ?? null,
    addressEn: en.formattedAddress ?? null,
    addressLocal: local?.formattedAddress ?? null,
    localLanguage: local ? localLanguage : null,
    countryCode,
    lat: en.location.latitude,
    lng: en.location.longitude,
    stopType: stopTypeFromPlaceTypes(types, en.primaryType),
    providerTypes: types,
  };
}

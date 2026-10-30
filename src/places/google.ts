import { languageForCountry } from '../phrases/languages';
import {
  toPlaceRecord,
  toSuggestions,
  type GoogleAutocompleteResponse,
  type GooglePlace,
} from './googleMapping';
import { PlacesError, type LatLng, type PlaceRecord, type PlaceSearch, type PlaceSuggestion } from './types';

const BASE_URL = 'https://places.googleapis.com/v1';

const AUTOCOMPLETE_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat';
// displayName makes Details bill at Pro. It is also the place's name, so it stays.
const DETAILS_EN_MASK = 'id,displayName,formattedAddress,location,types,primaryType,addressComponents';
// The local call only needs the script text; everything else came from English.
const DETAILS_LOCAL_MASK = 'id,displayName,formattedAddress';

const NEAR_RADIUS_METERS = 50000; // the API's maximum bias circle

export interface PlaceDetailsCache {
  get(placeId: string, languageCode: string): Promise<string | null>;
  put(placeId: string, languageCode: string, payload: string): Promise<void>;
}

/** Counts network calls against the local daily limit; returns false once it is spent. */
export type TakePlacesCall = () => Promise<boolean>;

export interface GooglePlaceSearchOptions {
  apiKey: string;
  cache: PlaceDetailsCache;
  takeCall: TakePlacesCall;
  /** Bundle id / package headers, required once the key is restricted to the app. */
  appHeaders?: Record<string, string>;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class GooglePlaceSearch implements PlaceSearch {
  private readonly options: GooglePlaceSearchOptions;

  constructor(options: GooglePlaceSearchOptions) {
    this.options = options;
  }

  async suggest(
    query: string,
    { session, near, signal }: { session: string; near?: LatLng; signal?: AbortSignal }
  ): Promise<PlaceSuggestion[]> {
    const body: Record<string, unknown> = { input: query, sessionToken: session, languageCode: 'en' };
    if (near) {
      body.locationBias = {
        circle: { center: { latitude: near.lat, longitude: near.lng }, radius: NEAR_RADIUS_METERS },
      };
    }
    const response = await this.request<GoogleAutocompleteResponse>(
      `${BASE_URL}/places:autocomplete`,
      { method: 'POST', body: JSON.stringify(body) },
      AUTOCOMPLETE_MASK,
      signal
    );
    return toSuggestions(response);
  }

  /**
   * Two calls, sequentially: the country is only known from the English response,
   * and it decides which language the official local-script name is fetched in.
   * Only the first carries the session token; the second is billed on its own.
   */
  async details(providerId: string, { session }: { session: string }): Promise<PlaceRecord> {
    const en = await this.place(providerId, 'en', DETAILS_EN_MASK, session);
    const record = toPlaceRecord(en, null, null);
    const localLanguage = languageForCountry(record.countryCode);
    if (!localLanguage) return record;

    const local = await this.place(providerId, localLanguage, DETAILS_LOCAL_MASK);
    return toPlaceRecord(en, local, localLanguage);
  }

  private async place(
    placeId: string,
    languageCode: string,
    mask: string,
    session?: string
  ): Promise<GooglePlace> {
    const cached = await this.options.cache.get(placeId, languageCode);
    if (cached) return JSON.parse(cached) as GooglePlace;

    const params = new URLSearchParams({ languageCode });
    if (session) params.set('sessionToken', session);
    const place = await this.request<GooglePlace>(
      `${BASE_URL}/places/${encodeURIComponent(placeId)}?${params}`,
      { method: 'GET' },
      mask
    );
    await this.options.cache.put(placeId, languageCode, JSON.stringify(place));
    return place;
  }

  private async request<T>(
    url: string,
    init: { method: string; body?: string },
    fieldMask: string,
    callerSignal?: AbortSignal
  ): Promise<T> {
    if (!(await this.options.takeCall())) {
      throw new PlacesError('quota', "Today's place searches are used up. Search comes back tomorrow.");
    }

    // A caller abort (a newer keystroke) propagates as-is; only our own timer
    // becomes a timeout error.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.options.timeoutMs ?? 10000);
    const forwardAbort = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    callerSignal?.addEventListener('abort', forwardAbort);

    let response: Response;
    try {
      response = await (this.options.fetch ?? fetch)(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.options.apiKey,
          'X-Goog-FieldMask': fieldMask,
          ...this.options.appHeaders,
        },
      });
    } catch (e) {
      if (timedOut) throw new PlacesError('timeout', 'Place search took too long. Try again.');
      if (callerSignal?.aborted) throw e;
      throw new PlacesError('offline', 'No connection. Place search needs signal.');
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', forwardAbort);
    }

    if (response.ok) return (await response.json()) as T;
    if (response.status === 429) {
      throw new PlacesError('quota', 'Place search has hit its limit for now. Try again later.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new PlacesError('denied', 'Place search is not set up for this app. Check the API key.');
    }
    throw new PlacesError('unknown', `Place search failed (${response.status}). Try again.`);
  }
}

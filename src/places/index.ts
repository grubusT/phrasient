import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getCachedPlace, putCachedPlace } from '../db/placeCache';
import { takePlacesCall } from '../db/placesUsage';
import { FixturePlaceSearch } from './fixture';
import { GooglePlaceSearch } from './google';
import type { PlaceSearch } from './types';

/**
 * Provider selection. The fixture is the default so development burns no quota;
 * set EXPO_PUBLIC_PLACES_PROVIDER=google and the key in .env.local for real
 * search. See docs/google-places-setup.md.
 *
 * Each env var is read as a literal `process.env.EXPO_PUBLIC_*` so Expo can
 * inline it at build time.
 */
export const PLACES_DAILY_LIMIT = Number(process.env.EXPO_PUBLIC_PLACES_DAILY_LIMIT) || 200;

function appHeaders(): Record<string, string> {
  if (Platform.OS === 'ios') {
    const bundleId = Constants.expoConfig?.ios?.bundleIdentifier;
    return bundleId ? { 'X-Ios-Bundle-Identifier': bundleId } : {};
  }
  if (Platform.OS === 'android') {
    const pkg = Constants.expoConfig?.android?.package;
    const cert = process.env.EXPO_PUBLIC_ANDROID_CERT_SHA1;
    return pkg && cert ? { 'X-Android-Package': pkg, 'X-Android-Cert': cert } : {};
  }
  return {};
}

function createPlaceSearch(): PlaceSearch {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
  if (process.env.EXPO_PUBLIC_PLACES_PROVIDER !== 'google' || !apiKey) {
    return new FixturePlaceSearch();
  }
  return new GooglePlaceSearch({
    apiKey,
    cache: { get: getCachedPlace, put: putCachedPlace },
    takeCall: () => takePlacesCall(PLACES_DAILY_LIMIT),
    appHeaders: appHeaders(),
  });
}

export const placeSearch = createPlaceSearch();

/** True when search is the offline stand-in, so screens can say so. */
export const isFixturePlaceSearch = placeSearch instanceof FixturePlaceSearch;

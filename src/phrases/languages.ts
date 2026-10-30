export interface CountryOption {
  countryCode: string;
  countryName: string;
  languageCode: string;
  languageName: string;
}

/**
 * Countries we ship a phrase pack for. A pin's country decides its language, so
 * this is the lookup the whole app derives language from — there is no longer a
 * per-leg language the user picks by hand.
 */
export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { countryCode: 'CN', countryName: 'China', languageCode: 'zh-CN', languageName: 'Mandarin' },
  { countryCode: 'VN', countryName: 'Vietnam', languageCode: 'vi', languageName: 'Vietnamese' },
];

const BY_COUNTRY = new Map(SUPPORTED_COUNTRIES.map((c) => [c.countryCode, c]));

/** Returns null for countries we have no pack for; callers show the place without phrases. */
export function languageForCountry(countryCode: string): string | null {
  return BY_COUNTRY.get(countryCode.toUpperCase())?.languageCode ?? null;
}

export function countryName(countryCode: string): string {
  return BY_COUNTRY.get(countryCode.toUpperCase())?.countryName ?? countryCode;
}

export function languageName(languageCode: string): string {
  return SUPPORTED_COUNTRIES.find((c) => c.languageCode === languageCode)?.languageName ?? languageCode;
}

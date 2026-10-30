export interface CountryOption {
  countryCode: string;
  countryName: string;
  languageCode: string;
}

// MVP only ships phrase packs for these languages — this list drives the leg picker.
export const AVAILABLE_COUNTRIES: CountryOption[] = [
  { countryCode: 'CN', countryName: 'China', languageCode: 'zh-CN' },
  { countryCode: 'VN', countryName: 'Vietnam', languageCode: 'vi' },
];

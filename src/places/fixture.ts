import { languageForCountry } from '../phrases/languages';
import { toPlaceRecord, type GooglePlace } from './googleMapping';
import { PlacesError, type PlaceRecord, type PlaceSearch, type PlaceSuggestion } from './types';

/**
 * Offline stand-in for Google, for development and tests, so day-to-day work
 * burns no quota. The payloads are hand-written in the Places API (New) shape —
 * not captured responses — so the fixture exercises the same mapping as Google.
 */

interface FixturePlace {
  en: GooglePlace;
  local: GooglePlace;
}

function place(
  id: string,
  countryCode: string,
  en: [name: string, address: string],
  local: [name: string, address: string],
  location: [lat: number, lng: number],
  types: string[]
): FixturePlace {
  return {
    en: {
      id,
      displayName: { text: en[0], languageCode: 'en' },
      formattedAddress: en[1],
      location: { latitude: location[0], longitude: location[1] },
      types,
      primaryType: types[0],
      addressComponents: [{ longText: countryCode, shortText: countryCode, types: ['country', 'political'] }],
    },
    local: { id, displayName: { text: local[0] }, formattedAddress: local[1] },
  };
}

export const FIXTURE_PLACES: FixturePlace[] = [
  place(
    'fixture-hanoi-metropole',
    'VN',
    ['Sofitel Legend Metropole Hanoi', '15 Ngo Quyen, Hoan Kiem, Hanoi, Vietnam'],
    ['Khách sạn Sofitel Legend Metropole Hà Nội', '15 Ngô Quyền, Hoàn Kiếm, Hà Nội, Việt Nam'],
    [21.0256, 105.8562],
    ['hotel', 'lodging', 'restaurant']
  ),
  place(
    'fixture-hanoi-bun-cha',
    'VN',
    ['Bun Cha Huong Lien', '24 Le Van Huu, Hai Ba Trung, Hanoi, Vietnam'],
    ['Bún chả Hương Liên', '24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội, Việt Nam'],
    [21.0181, 105.8538],
    ['vietnamese_restaurant', 'restaurant', 'food']
  ),
  place(
    'fixture-hanoi-dong-xuan',
    'VN',
    ['Dong Xuan Market', 'Dong Xuan, Hoan Kiem, Hanoi, Vietnam'],
    ['Chợ Đồng Xuân', 'Đồng Xuân, Hoàn Kiếm, Hà Nội, Việt Nam'],
    [21.0381, 105.8494],
    ['market', 'tourist_attraction']
  ),
  place(
    'fixture-hanoi-noi-bai',
    'VN',
    ['Noi Bai International Airport', 'Phu Minh, Soc Son, Hanoi, Vietnam'],
    ['Sân bay Quốc tế Nội Bài', 'Phú Minh, Sóc Sơn, Hà Nội, Việt Nam'],
    [21.2187, 105.8042],
    ['international_airport', 'airport']
  ),
  place(
    'fixture-hanoi-hoan-kiem',
    'VN',
    ['Hoan Kiem Lake', 'Hang Trong, Hoan Kiem, Hanoi, Vietnam'],
    ['Hồ Hoàn Kiếm', 'Hàng Trống, Hoàn Kiếm, Hà Nội, Việt Nam'],
    [21.0288, 105.8525],
    ['park', 'tourist_attraction']
  ),
  place(
    'fixture-shanghai-hongqiao',
    'CN',
    ['Shanghai Hongqiao Railway Station', '1500 Shengui Rd, Minhang, Shanghai, China'],
    ['上海虹桥站', '中国上海市闵行区申贵路1500号'],
    [31.1945, 121.3204],
    ['train_station', 'transit_station']
  ),
  place(
    'fixture-shanghai-pudong',
    'CN',
    ['Shanghai Pudong International Airport', '900 Qihang Rd, Pudong, Shanghai, China'],
    ['上海浦东国际机场', '中国上海市浦东新区启航路900号'],
    [31.1443, 121.8083],
    ['international_airport', 'airport']
  ),
  place(
    'fixture-shanghai-yu-garden',
    'CN',
    ['Yu Garden', '218 Anren St, Huangpu, Shanghai, China'],
    ['豫园', '中国上海市黄浦区安仁街218号'],
    [31.2272, 121.4921],
    ['tourist_attraction', 'garden']
  ),
  place(
    'fixture-shanghai-bund',
    'CN',
    ['The Bund', 'Zhongshan East 1st Rd, Huangpu, Shanghai, China'],
    ['外滩', '中国上海市黄浦区中山东一路'],
    [31.24, 121.49],
    ['tourist_attraction', 'historical_landmark']
  ),
];

/** Lowercased with diacritics stripped, so "cho dong" finds "Chợ Đồng Xuân". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

export class FixturePlaceSearch implements PlaceSearch {
  async suggest(query: string): Promise<PlaceSuggestion[]> {
    const q = fold(query.trim());
    return FIXTURE_PLACES.filter(
      ({ en, local }) =>
        fold(en.displayName!.text).includes(q) || fold(local.displayName!.text).includes(q)
    ).map(({ en }) => ({
      providerId: en.id,
      primaryText: en.displayName!.text,
      secondaryText: en.formattedAddress ?? '',
    }));
  }

  async details(providerId: string): Promise<PlaceRecord> {
    const found = FIXTURE_PLACES.find((p) => p.en.id === providerId);
    if (!found) throw new PlacesError('unknown', 'That place could not be found.');
    const record = toPlaceRecord(found.en, null, null);
    const localLanguage = languageForCountry(record.countryCode);
    return toPlaceRecord(found.en, localLanguage ? found.local : null, localLanguage);
  }
}

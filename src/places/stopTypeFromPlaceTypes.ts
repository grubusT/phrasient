import type { StopType } from '../db/types';

/**
 * Places types (Table A of Places API (New)) to stop types, in priority order.
 * A hotel that also lists `restaurant` is still accommodation, so transport and
 * lodging come first. Anything unmatched is `other`; the raw types stay on the pin
 * so a mis-map can be corrected later without re-querying.
 */
const RULES: [placesType: string, stopType: StopType][] = [
  ['airport', 'transport'],
  ['international_airport', 'transport'],
  ['train_station', 'transport'],
  ['subway_station', 'transport'],
  ['light_rail_station', 'transport'],
  ['bus_station', 'transport'],
  ['ferry_terminal', 'transport'],
  ['taxi_stand', 'transport'],
  ['transit_station', 'transport'],

  ['lodging', 'accommodation'],
  ['hotel', 'accommodation'],
  ['hostel', 'accommodation'],
  ['motel', 'accommodation'],
  ['guest_house', 'accommodation'],
  ['bed_and_breakfast', 'accommodation'],
  ['resort_hotel', 'accommodation'],

  ['night_club', 'nightlife'],
  ['bar', 'nightlife'],
  ['pub', 'nightlife'],
  ['wine_bar', 'nightlife'],
  ['karaoke', 'nightlife'],

  ['restaurant', 'restaurant'],
  ['food_court', 'restaurant'],
  ['cafe', 'restaurant'],
  ['coffee_shop', 'restaurant'],
  ['tea_house', 'restaurant'],
  ['bakery', 'restaurant'],
  ['meal_takeaway', 'restaurant'],

  ['market', 'market'],
  ['supermarket', 'market'],
  ['grocery_store', 'market'],
  ['convenience_store', 'market'],
  ['shopping_mall', 'market'],
  ['store', 'market'],

  ['national_park', 'outdoors'],
  ['park', 'outdoors'],
  ['hiking_area', 'outdoors'],
  ['beach', 'outdoors'],
  ['campground', 'outdoors'],
  ['botanical_garden', 'outdoors'],
  ['garden', 'outdoors'],

  ['tourist_attraction', 'attraction'],
  ['museum', 'attraction'],
  ['art_gallery', 'attraction'],
  ['historical_landmark', 'attraction'],
  ['cultural_landmark', 'attraction'],
  ['monument', 'attraction'],
  ['place_of_worship', 'attraction'],
  ['buddhist_temple', 'attraction'],
  ['church', 'attraction'],
  ['zoo', 'attraction'],
  ['aquarium', 'attraction'],
  ['amusement_park', 'attraction'],
];

const BY_TYPE = new Map(RULES);

/**
 * The provider's own primary type wins when it maps, since it is the place's
 * declared purpose. Otherwise the first rule in the table that matches any type.
 */
export function stopTypeFromPlaceTypes(types: string[], primaryType?: string): StopType {
  const primary = primaryType ? BY_TYPE.get(primaryType) : undefined;
  if (primary) return primary;
  const present = new Set(types);
  return RULES.find(([placesType]) => present.has(placesType))?.[1] ?? 'other';
}

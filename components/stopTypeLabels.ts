import type { StopType } from '../db/types';

export const STOP_TYPE_LABELS: Record<StopType, string> = {
  transport: 'Transport',
  accommodation: 'Accommodation',
  restaurant: 'Restaurant',
  market: 'Market',
  attraction: 'Attraction',
  nightlife: 'Nightlife',
  outdoors: 'Outdoors',
  other: 'Other',
};

export const STOP_TYPES: StopType[] = [
  'transport',
  'accommodation',
  'restaurant',
  'market',
  'attraction',
  'nightlife',
  'outdoors',
  'other',
];

import type { StopType } from '../db/types';
import type { PhraseCategory } from './types';

const STOP_TYPE_CATEGORIES: Record<StopType, PhraseCategory[]> = {
  transport: ['transport', 'directions'],
  accommodation: ['accommodation'],
  restaurant: ['ordering', 'dietary', 'paying'],
  market: ['shopping', 'paying'],
  attraction: ['directions'],
  nightlife: ['ordering', 'paying', 'nightlife'],
  outdoors: ['directions'],
  other: [],
};

export function categoriesForStopType(stopType: StopType): PhraseCategory[] {
  return [...STOP_TYPE_CATEGORIES[stopType], 'essentials'];
}

import type { StopType } from '../db/types';
import type { PhraseCategory } from './types';

/**
 * A phrase slug is a phrase id with its language prefix removed, so one rule
 * covers every pack: `zh-transport-05` and `vi-transport-05` are both
 * `transport-05`. See `phraseSlug` in ./resolve.ts.
 */
export type PhraseSlug = string;

export interface PhraseRule {
  categories: PhraseCategory[];
  /** Individual phrases pulled in from outside the listed categories. */
  include?: PhraseSlug[];
  /** Individual phrases held back from the listed categories. */
  exclude?: PhraseSlug[];
}

/**
 * Phrases you say while GETTING somewhere: hailing, riding, and finding your
 * way. Split out of the `transport` category, which also holds phrases you say
 * standing at a ticket desk.
 */
const IN_TRANSIT: PhraseSlug[] = [
  'transport-05', // Please take me to this address
  'transport-06', // Please stop here
  'transport-07', // How long does it take?
  'transport-08', // Is this the right bus?
  'transport-09', // Where is the nearest subway station?
  'transport-10', // I missed my stop
  'transport-11', // Can you use the meter?
  'transport-12', // I need to go to the airport
  'transport-14', // Please wait a moment
  'transport-15', // Last stop?
];

/**
 * What you say AT a place. `essentials` is appended to every type by the
 * resolver, so it is never listed here.
 *
 * Note what is absent: `directions` appears on no pin, and the in-transit
 * transport phrases are held back. Those belong to the move card between two
 * pins, and keeping them out here is what makes the two surfaces disjoint by
 * construction rather than by after-the-fact filtering.
 */
export const PIN_RULES: Record<StopType, PhraseRule> = {
  // Ticket desks, platforms, gates — not the ride itself.
  transport: { categories: ['transport'], exclude: IN_TRANSIT },
  accommodation: { categories: ['accommodation'] },
  restaurant: { categories: ['ordering', 'dietary', 'paying'] },
  market: { categories: ['shopping', 'paying'] },
  nightlife: { categories: ['ordering', 'paying', 'nightlife'] },
  // The packs carry no attraction- or outdoors-specific phrases yet, so these
  // fall back to essentials alone rather than borrowing unrelated categories.
  attraction: { categories: [] },
  outdoors: { categories: [] },
  other: { categories: [] },
};

export interface MoveRule extends PhraseRule {
  from: StopType | '*';
  to: StopType | '*';
}

/**
 * What you say GETTING from one pin to the next, chosen by (from type -> to type).
 * Ordered: the first rule matching both ends wins, so put specific pairs above
 * wildcards. The last entry is the catch-all and must stay last.
 *
 * Origin-pin phrases may legitimately repeat here — asking the hotel desk to
 * call a taxi is part of leaving the hotel. It is the *destination's* phrases
 * that must not be duplicated, since the move card sits directly above them.
 */
export const MOVE_RULES: MoveRule[] = [
  {
    // The brief's example: leaving a hotel for an airport wants the taxi
    // phrases plus the front-desk luggage and checkout ones.
    from: 'accommodation',
    to: 'transport',
    categories: ['directions'],
    include: [
      ...IN_TRANSIT,
      'accommodation-03', // Check-out, please
      'accommodation-11', // Can you call a taxi for me?
      'accommodation-12', // Can I store my luggage?
    ],
  },
  {
    from: '*',
    to: 'transport',
    categories: ['directions'],
    include: IN_TRANSIT,
  },
  {
    from: '*',
    to: '*',
    categories: ['directions'],
    include: IN_TRANSIT,
  },
];

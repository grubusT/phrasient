import type { StopType } from '../db/types';
import { MOVE_RULES, PIN_RULES, type MoveRule, type PhraseRule, type PhraseSlug } from './rules';
import type { Phrase, PhrasePack } from './types';

/**
 * Strips the language prefix from a phrase id: `zh-transport-05` -> `transport-05`.
 * Packs share slugs, which is what lets one rules table serve every language.
 *
 * Ids are `<language>-<category>-<number>`, so the slug is the trailing pair.
 * Taking it from the end rather than the front leaves an already-unprefixed id
 * alone instead of eating its category.
 */
export function phraseSlug(id: string): PhraseSlug {
  return id.split('-').slice(-2).join('-');
}

function resolve(pack: PhrasePack, rule: PhraseRule): Phrase[] {
  const excluded = new Set(rule.exclude ?? []);
  const included = new Set(rule.include ?? []);

  return pack.phrases.filter((phrase) => {
    const slug = phraseSlug(phrase.id);
    if (excluded.has(slug)) return false;
    return rule.categories.includes(phrase.category) || included.has(slug);
  });
}

/** Phrases for what you say AT a place. Essentials are always available. */
export function phrasesForPin(pack: PhrasePack, stopType: StopType): Phrase[] {
  const rule = PIN_RULES[stopType];
  return resolve(pack, { ...rule, categories: [...rule.categories, 'essentials'] });
}

export function matchMoveRule(from: StopType, to: StopType): MoveRule {
  const match = MOVE_RULES.find(
    (rule) => (rule.from === '*' || rule.from === from) && (rule.to === '*' || rule.to === to)
  );
  // The table ends in a { from: '*', to: '*' } catch-all, so this cannot be hit
  // unless that entry is removed.
  if (!match) throw new Error(`No move rule matched ${from} -> ${to}; the catch-all is missing`);
  return match;
}

/**
 * Phrases for GETTING from one pin to the next.
 *
 * The rules table is built so these never overlap the destination's pin detail.
 * The subtraction below enforces that at runtime too, so a future edit to the
 * table degrades into a missing phrase rather than a duplicated one.
 */
export function phrasesForMove(pack: PhrasePack, from: StopType, to: StopType): Phrase[] {
  const shownAtDestination = new Set(phrasesForPin(pack, to).map((p) => p.id));
  return resolve(pack, matchMoveRule(from, to)).filter((p) => !shownAtDestination.has(p.id));
}

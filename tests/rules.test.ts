import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { MOVE_RULES, PIN_RULES } from '../src/phrases/rules.ts';
import { floatPinned, matchMoveRule, phraseSlug, phrasesForMove, phrasesForPin } from '../src/phrases/resolve.ts';
import type { PhrasePack } from '../src/phrases/types.ts';
import type { StopType } from '../src/db/types.ts';

const require = createRequire(import.meta.url);
const PACKS: PhrasePack[] = [
  require('../src/phrases/packs/zh-CN.json'),
  require('../src/phrases/packs/vi.json'),
];
const STOP_TYPES = Object.keys(PIN_RULES) as StopType[];
const englishOf = (pack: PhrasePack, id: string) => pack.phrases.find((p) => p.id === id)!.english;

test('every pack shares the same slug set, so one rules table serves all languages', () => {
  const slugSets = PACKS.map((pack) => new Set(pack.phrases.map((p) => phraseSlug(p.id))));
  const [first, ...rest] = slugSets;
  for (const other of rest) {
    assert.deepEqual([...other].sort(), [...first].sort());
  }
});

test('every slug named in the rules table exists in every pack', () => {
  const named = new Set<string>();
  for (const rule of [...Object.values(PIN_RULES), ...MOVE_RULES]) {
    for (const slug of [...(rule.include ?? []), ...(rule.exclude ?? [])]) named.add(slug);
  }
  assert.ok(named.size > 0, 'the table should name some phrases explicitly');

  for (const pack of PACKS) {
    const slugs = new Set(pack.phrases.map((p) => phraseSlug(p.id)));
    for (const slug of named) {
      assert.ok(slugs.has(slug), `${pack.language} has no phrase ${slug}`);
    }
  }
});

test('pin detail always includes essentials', () => {
  for (const pack of PACKS) {
    for (const stopType of STOP_TYPES) {
      const categories = new Set(phrasesForPin(pack, stopType).map((p) => p.category));
      assert.ok(categories.has('essentials'), `${stopType} is missing essentials`);
    }
  }
});

test('a move card never repeats a phrase from the destination pin detail', () => {
  for (const pack of PACKS) {
    for (const from of STOP_TYPES) {
      for (const to of STOP_TYPES) {
        const atDestination = new Set(phrasesForPin(pack, to).map((p) => p.id));
        for (const phrase of phrasesForMove(pack, from, to)) {
          assert.ok(
            !atDestination.has(phrase.id),
            `${from} -> ${to}: "${phrase.english}" shows on both surfaces`
          );
        }
      }
    }
  }
});

test('the rules tables are disjoint by construction, not by filtering', () => {
  // phrasesForMove subtracts destination phrases as a safety net. If the tables
  // are written correctly that net never catches anything -- assert that, so a
  // table edit that creates an overlap is caught here rather than silently
  // shrinking a move card.
  for (const pack of PACKS) {
    for (const from of STOP_TYPES) {
      for (const to of STOP_TYPES) {
        const unfiltered = new Set(
          phrasesForMove(pack, from, to).map((p) => p.id)
        );
        const atDestination = new Set(phrasesForPin(pack, to).map((p) => p.id));
        const raw = pack.phrases.filter((p) => {
          const rule = matchMoveRule(from, to);
          const slug = phraseSlug(p.id);
          if ((rule.exclude ?? []).includes(slug)) return false;
          return rule.categories.includes(p.category) || (rule.include ?? []).includes(slug);
        });
        const removed = raw.filter((p) => atDestination.has(p.id) && !unfiltered.has(p.id));
        assert.deepEqual(
          removed.map((p) => p.english),
          [],
          `${from} -> ${to}: the table itself should not overlap the destination`
        );
      }
    }
  }
});

test('every move card offers something to say', () => {
  for (const pack of PACKS) {
    for (const from of STOP_TYPES) {
      for (const to of STOP_TYPES) {
        assert.ok(
          phrasesForMove(pack, from, to).length > 0,
          `${from} -> ${to} resolves to an empty move card`
        );
      }
    }
  }
});

test('hotel to airport surfaces taxi and luggage phrases', () => {
  const pack = PACKS[0];
  const english = phrasesForMove(pack, 'accommodation', 'transport').map((p) => p.english);

  assert.ok(english.includes('Please take me to this address'), 'the taxi phrase');
  assert.ok(english.includes('Can you use the meter?'), 'the taxi phrase');
  assert.ok(english.includes('Can I store my luggage?'), 'the luggage phrase');
  assert.ok(english.includes('Can you call a taxi for me?'), 'the front-desk phrase');
  assert.ok(english.includes("How do I get to...?"), 'directions come along');
});

test('ticket-desk phrases stay on the pin, ride phrases stay on the move', () => {
  const pack = PACKS[0];
  const atStation = phrasesForPin(pack, 'transport').map((p) => p.english);
  const gettingThere = phrasesForMove(pack, 'restaurant', 'transport').map((p) => p.english);

  assert.ok(atStation.includes('One ticket, please'), 'said at the desk');
  assert.ok(atStation.includes('Which platform?'), 'said at the desk');
  assert.ok(!atStation.includes('Please stop here'), 'said in the vehicle, not at the desk');

  assert.ok(gettingThere.includes('Please stop here'), 'said in the vehicle');
  assert.ok(!gettingThere.includes('One ticket, please'), 'already on the destination pin');
});

test('specific move rules win over the wildcard, and the catch-all is last', () => {
  assert.equal(matchMoveRule('accommodation', 'transport'), MOVE_RULES[0]);
  assert.equal(matchMoveRule('restaurant', 'market'), MOVE_RULES[MOVE_RULES.length - 1]);

  const last = MOVE_RULES[MOVE_RULES.length - 1];
  assert.equal(last.from, '*');
  assert.equal(last.to, '*');
  for (const stopType of STOP_TYPES) {
    assert.doesNotThrow(() => matchMoveRule(stopType, stopType));
  }
});

test('phraseSlug strips the language prefix', () => {
  assert.equal(phraseSlug('zh-transport-05'), 'transport-05');
  assert.equal(phraseSlug('vi-transport-05'), 'transport-05');
  assert.equal(phraseSlug('essentials-01'), 'essentials-01');
});

test('pinned phrases float above the rest without repeating, and only if they belong here', () => {
  const pack = PACKS[0];
  const here = phrasesForPin(pack, 'restaurant');
  const elsewhere = pack.phrases.find((p) => !here.includes(p))!;
  const pinnedIds = new Set([here[2].id, elsewhere.id]);

  const { pinned, rest } = floatPinned(here, pinnedIds);
  assert.deepEqual(pinned.map((p) => p.id), [here[2].id]);
  assert.equal(rest.length, here.length - 1);
  assert.ok(!rest.some((p) => pinnedIds.has(p.id)));
});

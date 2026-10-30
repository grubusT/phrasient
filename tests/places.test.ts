import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stopTypeFromPlaceTypes } from '../src/places/stopTypeFromPlaceTypes.ts';
import { toPlaceRecord, toSuggestions, type GooglePlace } from '../src/places/googleMapping.ts';
import { FIXTURE_PLACES, FixturePlaceSearch } from '../src/places/fixture.ts';
import { GooglePlaceSearch, type PlaceDetailsCache } from '../src/places/google.ts';
import { newSessionToken } from '../src/places/session.ts';
import { PlacesError } from '../src/places/types.ts';

function fixture(id: string) {
  const found = FIXTURE_PLACES.find((p) => p.en.id === id);
  assert.ok(found, id);
  return found;
}

// --- stop type mapping ---

test('a hotel with a restaurant is still accommodation', () => {
  assert.equal(stopTypeFromPlaceTypes(['restaurant', 'lodging']), 'accommodation');
});

test("the provider's primary type wins over table order", () => {
  assert.equal(stopTypeFromPlaceTypes(['lodging', 'bar'], 'bar'), 'nightlife');
});

test('an unmapped primary type falls through to the table', () => {
  assert.equal(stopTypeFromPlaceTypes(['vietnamese_restaurant', 'restaurant'], 'vietnamese_restaurant'), 'restaurant');
});

test('unknown types fall back to other', () => {
  assert.equal(stopTypeFromPlaceTypes(['point_of_interest', 'establishment']), 'other');
  assert.equal(stopTypeFromPlaceTypes([]), 'other');
});

// --- response mapping ---

test('autocomplete keeps place predictions and drops query predictions', () => {
  const suggestions = toSuggestions({
    suggestions: [
      {
        placePrediction: {
          placeId: 'abc',
          text: { text: 'Cho Ben Thanh, Ho Chi Minh City' },
          structuredFormat: { mainText: { text: 'Cho Ben Thanh' }, secondaryText: { text: 'Ho Chi Minh City' } },
        },
      },
      {},
    ],
  });
  assert.deepEqual(suggestions, [
    { providerId: 'abc', primaryText: 'Cho Ben Thanh', secondaryText: 'Ho Chi Minh City' },
  ]);
});

test('a Chinese place carries English and the official local script', () => {
  const { en, local } = fixture('fixture-shanghai-hongqiao');
  const record = toPlaceRecord(en, local, 'zh-CN');
  assert.equal(record.countryCode, 'CN');
  assert.equal(record.nameEn, 'Shanghai Hongqiao Railway Station');
  assert.equal(record.nameLocal, '上海虹桥站');
  assert.equal(record.addressLocal, '中国上海市闵行区申贵路1500号');
  assert.equal(record.localLanguage, 'zh-CN');
  assert.equal(record.stopType, 'transport');
  assert.deepEqual([record.lat, record.lng], [31.1945, 121.3204]);
});

test('a Vietnamese place keeps its diacritics', () => {
  const { en, local } = fixture('fixture-hanoi-bun-cha');
  const record = toPlaceRecord(en, local, 'vi');
  assert.equal(record.countryCode, 'VN');
  assert.equal(record.nameLocal, 'Bún chả Hương Liên');
  assert.equal(record.addressLocal, '24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội, Việt Nam');
  assert.equal(record.stopType, 'restaurant');
});

test('a place with no country cannot become a pin', () => {
  const en: GooglePlace = { id: 'x', displayName: { text: 'Somewhere' }, location: { latitude: 0, longitude: 0 } };
  assert.throws(() => toPlaceRecord(en, null, null), PlacesError);
});

// --- fixture provider ---

test('fixture search ignores case and Vietnamese diacritics', async () => {
  const search = new FixturePlaceSearch();
  const results = await search.suggest('cho dong');
  assert.deepEqual(results.map((r) => r.providerId), ['fixture-hanoi-dong-xuan']);
});

test('fixture details go through the same mapping as Google', async () => {
  const record = await new FixturePlaceSearch().details('fixture-hanoi-metropole');
  assert.equal(record.nameLocal, 'Khách sạn Sofitel Legend Metropole Hà Nội');
  assert.equal(record.stopType, 'accommodation');
});

// --- Google provider, against a fake fetch ---

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function fakeGoogle(
  respond: (call: Call) => Response | Promise<Response>,
  opts: { limit?: number; timeoutMs?: number } = {}
) {
  const calls: Call[] = [];
  const store = new Map<string, string>();
  const cache: PlaceDetailsCache = {
    get: async (id, lang) => store.get(`${id}:${lang}`) ?? null,
    put: async (id, lang, payload) => void store.set(`${id}:${lang}`, payload),
  };
  let used = 0;
  const search = new GooglePlaceSearch({
    apiKey: 'test-key',
    cache,
    takeCall: async () => (used < (opts.limit ?? Infinity) ? (used++, true) : false),
    appHeaders: { 'X-Ios-Bundle-Identifier': 'com.example.app' },
    timeoutMs: opts.timeoutMs,
    fetch: (async (url: string, init: RequestInit & { headers: Record<string, string> }) => {
      const call = { url, method: init.method!, headers: init.headers, body: init.body as string | undefined };
      calls.push(call);
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return respond(call);
    }) as unknown as typeof fetch,
  });
  return { search, calls, store };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function detailsResponder(id: string) {
  const { en, local } = fixture(id);
  return (call: Call) => json(new URL(call.url).searchParams.get('languageCode') === 'en' ? en : local);
}

test('details calls English first, then the local language for the country', async () => {
  const { search, calls } = fakeGoogle(detailsResponder('fixture-hanoi-bun-cha'));
  const record = await search.details('fixture-hanoi-bun-cha', { session: 'tok' });

  assert.equal(calls.length, 2);
  const [first, second] = calls.map((c) => new URL(c.url).searchParams);
  assert.equal(first.get('languageCode'), 'en');
  assert.equal(second.get('languageCode'), 'vi');
  assert.equal(record.nameLocal, 'Bún chả Hương Liên');
});

test('only the first details call carries the session token', async () => {
  const { search, calls } = fakeGoogle(detailsResponder('fixture-shanghai-bund'));
  await search.details('fixture-shanghai-bund', { session: 'tok' });
  const [first, second] = calls.map((c) => new URL(c.url).searchParams);
  assert.equal(first.get('sessionToken'), 'tok');
  assert.equal(second.get('sessionToken'), null);
});

test('every request sends the key, a field mask and the app restriction header', async () => {
  const { search, calls } = fakeGoogle(detailsResponder('fixture-shanghai-bund'));
  await search.details('fixture-shanghai-bund', { session: 'tok' });
  for (const call of calls) {
    assert.equal(call.headers['X-Goog-Api-Key'], 'test-key');
    assert.ok(call.headers['X-Goog-FieldMask']);
    assert.equal(call.headers['X-Ios-Bundle-Identifier'], 'com.example.app');
  }
});

test('a cached place costs zero calls', async () => {
  const { search, calls } = fakeGoogle(detailsResponder('fixture-hanoi-noi-bai'));
  await search.details('fixture-hanoi-noi-bai', { session: 'a' });
  const before = calls.length;
  const again = await search.details('fixture-hanoi-noi-bai', { session: 'b' });
  assert.equal(calls.length, before);
  assert.equal(again.nameLocal, 'Sân bay Quốc tế Nội Bài');
});

test('a country without a phrase pack makes one call and has no local script', async () => {
  const thai: GooglePlace = {
    id: 'th',
    displayName: { text: 'Wat Pho' },
    formattedAddress: 'Bangkok, Thailand',
    location: { latitude: 13.7465, longitude: 100.4927 },
    types: ['buddhist_temple'],
    addressComponents: [{ longText: 'Thailand', shortText: 'TH', types: ['country', 'political'] }],
  };
  const { search, calls } = fakeGoogle(() => json(thai));
  const record = await search.details('th', { session: 'tok' });
  assert.equal(calls.length, 1);
  assert.equal(record.nameLocal, null);
  assert.equal(record.localLanguage, null);
  assert.equal(record.stopType, 'attraction');
});

test('autocomplete posts the query with the session token and a location bias', async () => {
  const { search, calls } = fakeGoogle(() => json({ suggestions: [] }));
  await search.suggest('bun cha', { session: 'tok', near: { lat: 21, lng: 105.8 } });
  const body = JSON.parse(calls[0].body!);
  assert.equal(calls[0].method, 'POST');
  assert.equal(body.input, 'bun cha');
  assert.equal(body.sessionToken, 'tok');
  assert.deepEqual(body.locationBias.circle.center, { latitude: 21, longitude: 105.8 });
});

async function errorKind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    assert.ok(e instanceof PlacesError, `expected PlacesError, got ${e}`);
    return e.kind;
  }
  assert.fail('expected a failure');
}

test('network failure is reported as offline', async () => {
  const { search } = fakeGoogle(() => {
    throw new TypeError('Network request failed');
  });
  assert.equal(await errorKind(search.suggest('hanoi', { session: 't' })), 'offline');
});

test('a slow response is reported as a timeout', async () => {
  const { search } = fakeGoogle(
    (call) =>
      new Promise<Response>((_, reject) => {
        void call;
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 50);
      }),
    { timeoutMs: 10 }
  );
  assert.equal(await errorKind(search.suggest('hanoi', { session: 't' })), 'timeout');
});

test('HTTP 429 is quota and 403 is denied', async () => {
  assert.equal(
    await errorKind(fakeGoogle(() => json({}, 429)).search.suggest('hanoi', { session: 't' })),
    'quota'
  );
  assert.equal(
    await errorKind(fakeGoogle(() => json({}, 403)).search.suggest('hanoi', { session: 't' })),
    'denied'
  );
});

test('the local daily limit stops requests before they are sent', async () => {
  const { search, calls } = fakeGoogle(() => json({ suggestions: [] }), { limit: 1 });
  await search.suggest('hanoi', { session: 't' });
  assert.equal(await errorKind(search.suggest('hanoi', { session: 't' })), 'quota');
  assert.equal(calls.length, 1);
});

test('a caller abort is passed through, not reported as offline', async () => {
  const { search } = fakeGoogle(() => json({ suggestions: [] }));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(search.suggest('hanoi', { session: 't', signal: controller.signal }), (e: unknown) => {
    assert.ok(!(e instanceof PlacesError));
    return true;
  });
});

test('session tokens are UUIDv4 and fit the 36-character limit', () => {
  const token = newSessionToken();
  assert.match(token, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(newSessionToken(), token);
});

# Decisions

Non-obvious choices in the map-first redesign, and the reasons behind them. The
code shows *what*; this file exists so a later session does not "simplify" one
of these back into a bug.

Running spec: `~/.claude/plans/quiet-dazzling-candle.md`.

## Data

**The v1 `legs` and `stops` tables are renamed, not dropped.** The v2 migration
leaves them as `legs_v1_backup` / `stops_v1_backup`. Nothing in the app reads
them. They stay until the pin model has survived real use; a later
`SCHEMA_VERSION = 3` can drop them. Renaming rather than dropping is what makes
the migration safe to ship without a backup story.

**Migrated pins have no coordinates, and none may be invented.** v1 never stored
lat/lng. Geocoding migrated stops at migration time would silently attach wrong
places to real trips. They surface in the UI as "Not on the map yet" with a
Places lookup the user confirms. `listUnplacedPins` exists for this.

**Pins are re-ranked by day then time, with untimed pins last.** The brief asked
for day-then-time ordering, so the migration sorts on
`COALESCE(time, '99:99'), order_index, id`: timed pins follow the clock, untimed
ones keep their manual order at the end of the day. Partitioning by
`(trip_id, day_date)` rather than by leg means two legs that shared a calendar
date merge into one continuous day instead of two zero-based runs.

**`order_index` is 0-based and dense within a day.** `deletePin` and `movePin`
both close the gap they leave. `movePin`'s `targetIndex` is the position *after*
removal, which is what drag-and-drop reports — do not change this contract
without updating both callers.

**Only `display_name` is user-editable.** `official_name` / `official_address`
hold provider text in local script and are never overwritten by a rename, because
the show-the-driver screen depends on them being what the country actually writes.

## Phrases

**Rules key off a language-neutral slug.** Phrase ids are
`<language>-<category>-<number>`, so `zh-transport-05` and `vi-transport-05`
share the slug `transport-05`. `phraseSlug` takes the *trailing* pair rather than
stripping the leading segment, so an id without a language prefix keeps its
category. One rules table therefore serves every pack. A test asserts all packs
share an identical slug set — adding a pack that breaks that will fail there.

**`IN_TRANSIT` is split out of the `transport` category.** The category mixes
phrases said at a ticket desk ("One ticket, please", "Which platform?") with
phrases said in a moving vehicle ("Please stop here", "Can you use the meter?").
Pin detail wants the former, move cards the latter. Without this split the two
surfaces overlap on every transport pin.

**Move cards and pin detail are disjoint by construction, not by filtering.**
`phrasesForMove` does subtract the destination's phrases, but that is a safety
net. The tables are written so it never has to fire, and a test asserts the net
catches nothing. This matters: the subtraction alone, applied to overlapping
tables, empties every transport move card rather than trimming it.

**Origin-pin phrases may legitimately repeat on a move card.** Asking the hotel
desk to call a taxi belongs to both the hotel pin and the hotel→airport move.
Only the *destination's* phrases must not be duplicated, since the move card sits
directly above them. This is why the subtraction is one-directional.

**`attraction`, `outdoors` and `other` fall back to essentials alone.** The packs
carry no phrases specific to them yet. Borrowing an unrelated category to pad the
screen would be worse than a short one. Fix by writing phrases, not by editing
rules.

## Places

**Two Place Details calls per pin, English then local.** No Places field returns
local script alongside English — `languageCode` applies to the whole response.
The country is only known after the first call (`addressComponents`), so the
calls are sequential: Details(`en`) → `languageForCountry(countryCode)` →
Details(local). Responses are cached in `place_details_cache`, so this is a
one-time cost per place.

**`displayName` is a Pro-tier field**, so Place Details bills at Pro, not
Essentials. Dropping `displayName` from the field mask would drop the tier — but
also the place's name, so it stays.

**Autocomplete is free inside a session token** that ends in a Details call. Mint
one token per add-pin flow and pass it to Autocomplete and the *first* Details
call. The second (local-language) call falls outside the session and is billed.

**Of the spend caps, only some are hard stops.** Cloud Console → IAM & Admin →
Quotas (service `places.googleapis.com`) is the real daily cap; Maps Platform
ships no daily limit by default. A billing budget *alert* stops nothing — the
hard version is budget + Pub/Sub → a function that disables billing. Client-side
debounce, minimum query length, caching and the local daily counter are comfort,
not enforcement. See `docs/google-places-setup.md`.

## Map and offline

**Offline tiles come from OpenFreeMap, not a Protomaps planet.** The brief said
"Protomaps PMTiles extract". The PMTiles *format* is kept; the Protomaps planet
is not. OpenFreeMap serves the unmodified OpenMapTiles schema, and building
extracts from the same source we stream online means **one style JSON works both
online and offline**. A Protomaps planet uses a different schema and would mean a
second style to keep in sync, plus an API key or self-hosting.

**OpenFreeMap's bulk-download policy is the binding constraint on region size:**
at most 3,000 tiles or 50 MB per download, at most 4 parallel requests, and a
unique `User-Agent` identifying the app. `zoomFit` picks the largest max zoom
that fits — roughly z13 city-wide, z14 for a tight box. Raising the detail means
self-hosting or asking them, not raising the number.

**PMTiles sources do not participate in MapLibre's offline packs or ambient
cache.** MapLibre Native handles the `pmtiles://` protocol itself (local archives
are `pmtiles://file:///abs/path.pmtiles`, no JS shim needed), but `OfflineManager`
cannot download them. The app owns the download. This is why there is a PMTiles
writer in the codebase at all.

**Glyphs and sprites break offline even when tiles work.** A style's `glyphs` and
`sprite` URLs are remote. Bundle the sprite and the Latin + Latin-Extended-
Additional ranges (covers Vietnamese), and set `localIdeographFontFamily` so CJK
renders from system fonts rather than downloaded glyph PBFs — otherwise Chinese
costs megabytes of bundled font.

**MapLibre React Native v11 is not the API you remember.** It is `Map` (not
`MapView`), with a `mapStyle` prop; annotations are `Marker` and `ViewAnnotation`;
`Camera` takes `initialViewState` and bounds as `[west, south, east, north]`.
v11 is new-architecture only. Check
`node_modules/@maplibre/maplibre-react-native/lib/typescript/module/index.d.ts`
before writing map code.

## Design

**`src/theme.ts` is the only source of colour, type scale, spacing and radius.**
The pre-redesign code had no tokens — raw hex repeated in every screen. That is
not a precedent to follow. No raw hex in components.

**Type inverts the usual hierarchy.** English is the caption; the local script is
the object. A phrase row is a large script line with a small English line above
it, not the reverse. `PhraseRow` sets this and show-the-driver is the extreme of
the same rule, not a separate idea.

**Saturation is spent in one place.** `color.lacquer` is for numbered pins and
their sheet counterparts. Everything else is paper, ink and wash so the basemap
reads through.

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

**"Floated to the top" means pinned phrases that belong on this surface.**
Pin detail and move cards show phrases already in the pinbook first, under
"From your pinbook", then the rest. A pinned phrase that the rules do not put on
this surface is not pulled in; it stays in the pinbook tab. `floatPinned` does
the split and never duplicates a phrase.

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

**The fixture provider is the default; Google is opt-in by env.**
`EXPO_PUBLIC_PLACES_PROVIDER=google` plus a key selects Google; anything else
gets `FixturePlaceSearch`. Day-to-day work and tests then burn no quota. The
fixture is written as Google-shaped payloads and goes through the same
`toPlaceRecord`, so it tests the mapping rather than bypassing it.

**The local daily counter lives in SQLite (`places_usage`, schema v3).** One
database and one `src/db` access pattern, rather than a second store
(`expo-sqlite/kv-store`) the node tests cannot import. The count is taken
*before* each network request and cache hits never count. It is a comfort guard;
see the spend-cap note above for what actually stops a bill.

**Every Places failure is a `PlacesError` with a kind:** `offline` (fetch threw),
`timeout` (our 10 s timer fired), `quota` (HTTP 429 or the local counter),
`denied` (401/403, usually key restrictions) and `unknown`. The message is the
user-facing copy. A caller abort, which is a newer keystroke superseding an old
request, is deliberately *not* converted, so the screen can ignore it instead of
flashing "No connection". Offline and quota errors point the user at
long-press, which needs no network.

**Stop type: the provider's `primaryType` wins, then table order.** A hotel lists
`restaurant` among its types, so a table-only match on "any type" depends on
table order; `primaryType` is the place's declared purpose. Unmapped primaries
(e.g. `vietnamese_restaurant`) fall through to the table. Raw types are stored on
the pin either way.

**Manual pins only offer countries we have a pack for.** `country_code` is NOT
NULL and decides the language, and a hand-dropped pin has no provider to ask. A
long-press outside China or Vietnam therefore has to pick one of the two; fix by
adding packs, or by reverse-geocoding when that is worth a network call.

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

## Sheet

**A move has one definition: `applyMove` in `src/lib/trip.ts`.** The sheet applies
it before SQLite answers (otherwise a dropped row snaps back for a frame) and
`movePin` writes exactly what it returns. Two implementations of the same
reorder would drift; this way the tested function is the one that persists.

**The sheet list is flat, with day headers as rows.** Dragging a pin past a
header is what moves it to another day; `dropTarget` reads the nearest header
above the drop. Empty days, including one after the last pinned day, are listed
so there is somewhere to drop. Headers never start a drag.

**Drag inside the bottom sheet is the fragile part.** The list renders through
`useBottomSheetScrollableCreator` so the sheet and the list share scrolling, and
`enableContentPanningGesture` is turned off while a pin is dragged so the sheet
does not move with it. Drag is long-press only, so a plain swipe still scrolls.
Screen readers get "Move earlier" / "Move later" actions doing the same one-row
move, since drag is not accessible.

**Tapping a marker does not snap the sheet.** The peek card already shows the
selected pin; raising the sheet would cover the map the user just tapped.

**A move is drawn inside the destination pin's list cell, not as its own row.**
`MoveRow` ("From 3. Hotel") sits above each pin that has a previous pin, crossing
days. As a separate row it would break `dropTarget`'s index count and the
screen-reader step actions, which both assume rows are only days and pins. It is
hidden while a drag is in progress, since it would travel with the dragged pin
and name the wrong origin. `previousPin` is the only definition of a move.

**Pin detail and move cards replace the list inside the same sheet.** Opening
one snaps to half; a back button and Android back return to the list. Selecting
a different pin on the map, or tapping empty map, closes it. The detail is keyed
by its pin, so editing or deleting the pin from the edit modal shows the change
(or drops back to the list) when the map screen reloads on focus.

## Driver card

**The driver card never falls back to the display name or English.**
`driverCardText` returns the official local-script address and name, or null.
The pre-redesign screen fell back to `display_name`, which hands a driver a
nickname they cannot use. With no local text the button reads "Temporarily
unavailable" and is disabled (Ryan's copy). A test asserts the fallback cannot
return.

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

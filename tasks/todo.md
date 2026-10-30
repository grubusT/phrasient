# Phases 4-6: Pin detail, move cards, pinbook

Spec: `~/.claude/plans/quiet-dazzling-candle.md` (Phases 4-6, Screens and components). Reasons: `docs/decisions.md` (Phrases, Sheet).

Already in place: `PIN_RULES`/`MOVE_RULES`, `phrasesForPin`/`phrasesForMove` with tests, `pinned_phrases` table and queries, `PhraseRow` with a pin toggle, a Pinbook tab and a search screen (neither reachable from anywhere yet), a show-driver route nothing opens.

## Plan

### Pure logic (tested under `node --test`)
- [x] `previousPin(pins, pinId)` in `src/lib/trip.ts`: the pin before it in trip order, crossing days. A move is derived from this, never stored.
- [x] `src/lib/driverCard.ts`: `driverCardText(pin)` returns the official local-script name/address, or null. Never falls back to `display_name` or English (the current show-driver screen does; that breaks a product rule and gets fixed here).
- [x] `floatPinned(phrases, pinnedIds)` in `src/phrases/resolve.ts`: splits a surface's phrases into pinned matches (shown first) and the rest, no duplicates.

### Phase 4: pin detail in the sheet
- [x] `TripSheet` gains a detail view: `{ pin } | { move to pin } | null`. Row tap and peek-card tap open it and snap to half; a back button and Android back return to the list. Marker tap still only selects (unchanged).
- [x] `components/detail/PinDetailView`: number, display name, stop type, Edit; `AddressCard` (English caption above local-script name and address); `ShowDriverButton`; `UnreviewedPackWarning`; pinned matches then suggestions as `PhraseRow`s. Pins in a country without a pack say so instead of showing phrases. Renders in `BottomSheetScrollView`.
- [x] Phrase tap opens new `phrase/[languageCode]/[phraseId]` full screen. Show-driver and it share a `HoldUpScreen` (black ground, driver type, keep-awake, labelled 44pt close). Show-driver loses its `mode=phrase` branch.
- [x] Driver card with no official text: button disabled with "Temporarily unavailable" (your copy), plus Find on map for unplaced pins.
- [x] `pin/[pinId]/edit` modal: rename (display name only), stop type, day, delete with confirmation. Nothing can edit or delete a pin today, and the old stop screen had both.

### Phase 5: move cards
- [x] `MoveRow`: a slim "From 3. Hotel" line drawn above each pin that has a previous pin, inside the pin's list cell. Hidden while a drag is in progress. Keeping it inside the cell leaves `sheetRows`/`dropTarget` and the a11y step actions untouched.
- [x] `components/detail/MoveCard`: "From A to B", the destination's driver card, then `phrasesForMove(from, to)` in the destination's language, pinned matches floated first. No routes, times or modes.

### Phase 6: pinbook
- [x] `usePinnedPhrases(languageCode)` hook: ids + toggle, shared by pin detail, move card, search and pinbook.
- [x] Pinbook tab: phrase tap opens full screen, unreviewed warning, a "Search phrases" button opening search as a modal (gets a native header; register it in the root stack).
- [x] Search: warning, full-screen on tap.
- [x] `languageName` on `SUPPORTED_COUNTRIES` so the warning says "Mandarin", not "zh-CN".

### Docs
- [x] `docs/decisions.md`: move line lives in the pin cell; floating means pinned ∩ this surface; driver card never falls back.

### Verify
- [x] Tests for the three pure functions; `npm test`, both typechecks, `npx expo lint`, `npx expo export --platform ios`
- [ ] Not verifiable by me: anything on device (sheet content swap, snaps, full screen, airplane mode)

## Review

Done 30 Oct 2026, pending device check. 70 tests pass (5 new); both typechecks, `npx expo lint` and `npx expo export --platform ios` are clean.

Changed from the plan:
- Pinbook and search language pills now use the shared `PillPicker` (they had hand-rolled copies at under 44pt).
- Search became a modal with a native header, so it has a way back; it had none.
- Show-driver's English caption is kept small under the local text, for the user, not the driver.

Not verified (needs a dev build): sheet content swap and snap to half, Android back, the move line hiding mid-drag, full-screen phrase and driver screens, edit and delete, airplane mode.

Known gaps:
- Selecting a pin, tapping empty map, then tapping the same marker does not reopen its detail; only row or peek-card taps open it. Intended, but worth checking it feels right.
- Pins in a country without a pack show "No phrases for X yet" and no phrases.

# Phase 3: Sheet with pin list

Spec: `~/.claude/plans/quiet-dazzling-candle.md` (Phase 3, Screens and components). Reasons: `docs/decisions.md`.

## Plan

### Pure logic (tested under `node --test`)
- [x] `src/lib/trip.ts`: `applyMove(pins, pinId, targetDay, targetIndex)`, the single definition of a move, used by the optimistic UI and by `movePin`
- [x] `sheetRows(trip, pins)`: flat list of day headers and pins, empty days included so a pin can be dragged onto them
- [x] `dropTarget(rows, from, to)`: turns a drag between flat rows into `(day, index)` via the nearest header above
- [x] `movePin` reads the trip, runs `applyMove`, writes only changed rows in one transaction. Contract unchanged.

### Sheet (`src/components/sheet/`)
- [x] `TripSheet`: three snaps (peek sized to the measured peek card, 50%, 92%), lifted out of the map screen
- [x] `PeekCard`: selected pin, else `currentOrNextPin` by the clock
- [x] Day headers + `PinRow`; empty days say "Nothing planned"
- [x] Unplaced pins stay in their day with "Not on the map yet" and a "Find on map" button to `/add-pin?pinId=`
- [x] Drag and drop (your call over up/down buttons): long-press a row, drag past day headers to change day. `react-native-reorderable-list` rendered through `useBottomSheetScrollableCreator`; sheet panning is off while dragging
- [x] Screen-reader actions "Move earlier" / "Move later" do the same move one row at a time, since drag is not accessible

### Map and sheet
- [x] Tap a marker: selects it and the peek card shows it (no snap; the peek already shows the pin, and snapping would hide the map)
- [x] Tap a row: selects it and flies the camera there, padded so it lands above the half sheet
- [x] Markers renumber as soon as a pin is dropped

### Not in this phase
- Dashed connector (Phase 7), move rows (Phase 5), pin detail on row tap (Phase 4)

### Verify
- [x] Tests: moves within a day, across days, onto an empty day, past the end; sheet rows with gaps and pre-start pins; drop targets within a day, across headers, onto the trailing empty day, above the first header; headers not draggable; drop target + move round trip
- [x] `npm test` (65 pass, 12 new), both typechecks, `npx expo lint`, `npx expo-doctor` 20/20, `npx expo export --platform ios`
- [ ] Not verifiable by me: drag inside the sheet, snaps, camera fly, airplane mode (needs a dev build)

## Review

Done 30 Oct 2026, pending device check.

Changed from the plan:
- Drag and drop replaced the up/down reorder mode.
- `movePin` now computes the order with `applyMove` instead of three shifting UPDATEs, so the SQL and the instant UI cannot drift. Its SQL is still untested directly (the db module imports expo-sqlite), but the logic it runs is.
- No snap to half on marker tap (see above).

Biggest risk: drag inside a scrolling `@gorhom/bottom-sheet` is a known gesture-conflict area. If dragging fights the sheet on device, the fallback is the accessibility step actions surfaced as visible buttons.

New dependency: `react-native-reorderable-list` 0.18 (Reanimated-based drag for FlatList; no drag-and-drop exists in the current deps). Its typings reference RNGH 2 type names that RNGH 3 renamed; harmless under `skipLibCheck`, runtime APIs (`Gesture`, `GestureDetector`) are unchanged.

# Phase 2: Places pin adding

Spec: `~/.claude/plans/quiet-dazzling-candle.md` (PlaceSearch section). Reasons: `docs/decisions.md` (Places).

## Plan

### Pure logic (tested under `node --test`, no React Native)
- [x] `src/places/types.ts`: `PlaceSearch`, `PlaceSuggestion`, `PlaceRecord`, `LatLng`, and a typed `PlacesError` (`offline | timeout | quota | denied | unknown`) so every screen can show a specific state
- [x] `src/places/stopTypeFromPlaceTypes.ts`: ordered `(placesType -> StopType)` table, `other` fallback
- [x] `src/places/googleMapping.ts`: raw Places (New) JSON -> `PlaceRecord` (country from `addressComponents`, local name/address from the second response)
- [x] `src/places/session.ts`: session token mint (UUIDv4 from `Math.random`; not a secret, so no `expo-crypto` dependency)
- [x] `src/places/fixture.ts`: `FixturePlaceSearch` with a handful of real Hanoi + Shanghai places, local script included
- [x] `src/places/google.ts`: `GooglePlaceSearch` taking an injected `fetch` and a cache/counter port, so it is testable with a fake fetch:
  - Autocomplete `POST /v1/places:autocomplete` with session token, `locationBias` when `near` is given
  - Details(`en`) with the session token -> `languageForCountry` -> Details(local) without it
  - Both responses read from / written to `place_details_cache` first
  - 10 s timeout via `AbortController`; maps network failure / 429 / 403 to `PlacesError`
  - Sends `X-Ios-Bundle-Identifier` / `X-Android-Package` so key restrictions work
- [x] `src/places/index.ts`: picks provider from `EXPO_PUBLIC_PLACES_PROVIDER` (`fixture` default, `google` needs `EXPO_PUBLIC_GOOGLE_PLACES_KEY` in `.env.local`, gitignored)

### Data
- [x] `src/db/placeCache.ts`: get/put on the existing `place_details_cache`
- [x] Daily call counter: **v3 migration** adding `places_usage(day TEXT PRIMARY KEY, calls INTEGER NOT NULL)`, plus `src/db/placesUsage.ts`. Seeded-v2 test proves existing data survives. Limit from `EXPO_PUBLIC_PLACES_DAILY_LIMIT`, default 200. Once tripped, search is disabled with a message until tomorrow.

### Screens
- [x] `src/app/add-pin/index.tsx` (modal): search field (300 ms debounce, 3-char minimum, abort stale requests), results, then a confirm step showing English + local script, the mapped stop type (changeable) and the day (stepper over trip days) before `createPin`. Offline/timeout/quota/denied states each get their own copy.
- [x] `src/app/add-pin/manual.tsx`: reached by long-press on the map with the coordinate. Fields: display name, local-script name and address (the driver card needs them), country (from `SUPPORTED_COUNTRIES`), stop type, day. Saves `source: 'manual'`. Works fully offline.
- [x] Map screen: an "Add pin" button and `onLongPress` -> manual. Minimal wiring only; the sheet itself is Phase 3.
- [x] "Not on the map yet" pins: add-pin accepts `?pinId=` and calls `setPinLocation` instead of `createPin` (prefilled with the pin name). Wiring the button into the sheet waits for Phase 3.

### Docs
- [x] `docs/google-places-setup.md`: key creation, API + app restrictions, Quotas page daily caps, per-minute caps, budget + Pub/Sub kill switch, `.env.local`
- [x] `docs/decisions.md`: provider selection, counter-in-SQLite, error taxonomy

### Verify
- [x] Tests: stop-type mapping, Google response mapping (zh + vi fixtures), two-call flow + cache hit makes zero calls, error mapping, the daily-limit guard (against a fake counter; the SQLite counter itself is untested), v2 -> v3 migration
- [x] `npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tests/tsconfig.json`, `npx expo lint`, `npx expo-doctor`, `npx expo export --platform ios`
- [ ] Not verifiable by me: on-device flow, airplane mode, one live call per country (needs your key and a dev build)

## Review

Done 30 Oct 2026. 53 tests pass (25 new); app and test typecheck, lint, `expo-doctor` (20/20) and `expo export --platform ios` are clean.

Changed from the plan:
- `setPinLocation` now also stores `place_types`, so a placed migrated pin keeps its raw types like a new one.
- The test helper `apply()` replayed every migration from v1 regardless of `user_version`; it now skips applied versions like `migrate()` does. Needed for the first v2 -> v3 test.
- A request with an already-aborted caller signal was sent anyway. Fixed; caught by a test.

Not verified (needs a dev build and a key): the screens on device, the native modal headers, long-press, airplane mode, one live call per country.

Known gaps:
- `app.json` has no `android.package`, so the Android key-restriction headers are not sent.
- Manual pins can only pick China or Vietnam (see decisions.md).
- The "Find on map" entry for unplaced pins (`/add-pin?pinId=`) exists but has no button until Phase 3's sheet.

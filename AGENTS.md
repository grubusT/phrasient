This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

Phrasient is a map-first travel phrasebook: a trip is an ordered list of pins
grouped by day, drawn on a map, where each pin and each move between pins
surfaces the phrases you need in the local language.

**Read `docs/decisions.md` before changing the schema, the phrase rules, the
Places layer, or anything offline.** It records why those are shaped the way
they are; the reasons are not recoverable from the code alone. The running spec
is `~/.claude/plans/quiet-dazzling-candle.md`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

The same applies to MapLibre React Native, whose v11 API differs from earlier
versions. Read the bundled types in
`node_modules/@maplibre/maplibre-react-native/lib/typescript/module/` rather
than recalling the API.

## Requirements

- **Node ≥ 22.13** (Expo SDK 58 refuses to run below it). `.nvmrc` pins 24.
  If tooling reports an outdated Node, run `nvm use` first.
- **A development build is required.** MapLibre ships native code, so Expo Go
  cannot run this app: `npx expo run:ios` / `npx expo run:android`, or
  `eas build --profile development`.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npm test                    # node --test over tests/ — migration, phrase rules, trip helpers, places
npx tsc --noEmit            # typecheck the app
npx tsc --noEmit -p tests/tsconfig.json  # typecheck the tests (separate: they use Node types)
npx expo lint               # lint
npx expo start              # start the dev server
npx expo export --platform ios  # verifies the whole module graph resolves, without a native build
npx expo-doctor             # diagnose dependency and config issues
```

Run lint, typecheck and tests before declaring any task done.

## Project layout

Everything lives under `src/`, aliased as `@/*`.

```
src/
  app/          expo-router routes — (tabs)/ is Map, Pinbook, Trips
  db/           client, migrations, and one module per table
  phrases/      packs/, rules.ts, resolve.ts, loader, search, languages
  map/          style, PMTiles, offline regions
  places/       PlaceSearch interface and providers
  components/   shared UI; map/ holds map-specific pieces
  lib/          date and trip helpers
  theme.ts      design tokens
tests/          node --test; see tests/ts-resolver.mjs for extensionless imports
docs/           decisions.md, google-places-setup.md
```

Keep non-route code out of `src/app/` — every file there is a screen, and
`_layout.tsx` files define navigators.

## Conventions

- **Use the tokens in `src/theme.ts`.** No raw hex, font sizes, spacing or radii
  in components. The pre-redesign code had none of this; it is not a precedent.
- **Local script is the hero.** English is the caption above it, not the other
  way round. See `PhraseRow`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
  Docs: https://docs.expo.dev/router/introduction.md
- Destructive actions (deleting a trip, a pin, or an offline region) confirm
  first, and say what else goes with them.
- Pure logic — migrations, phrase rules, trip ordering — belongs in a module a
  test can import without React Native. That is why `tests/` can cover them.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `npx eas-cli@latest <command>`.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

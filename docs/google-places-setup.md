# Google Places setup

The app searches places with Places API (New). Until this is set up it uses the
built-in fixture places (a few in Hanoi and Shanghai), which need no key and no
network. Why it is shaped this way: `docs/decisions.md`, section Places.

## 1. Key

1. In Google Cloud Console, create or pick a project with billing enabled.
2. APIs & Services → Library → enable **Places API (New)**. Not the legacy
   "Places API".
3. APIs & Services → Credentials → Create credentials → API key.

## 2. Restrict the key

The key ships inside the app bundle, so anyone can extract it. Restrictions are
what make that survivable.

- **API restrictions:** Places API (New) only.
- **Application restrictions:** a key takes one kind. Two keys (one iOS, one
  Android) is the clean setup; the app sends whichever headers match its platform.
  - iOS apps: bundle id `com.anonymous.phrasient` (from `app.json`). The app sends
    `X-Ios-Bundle-Identifier` on every request.
  - Android apps: package name plus signing-certificate SHA-1. The app sends
    `X-Android-Package` and `X-Android-Cert`. **`app.json` has no
    `android.package` yet**, so the Android headers are not sent until one is set
    and `EXPO_PUBLIC_ANDROID_CERT_SHA1` is provided.

These headers are what Google checks for REST calls from an app; without them a
restricted key is rejected with 403, which the app shows as "not set up".

## 3. Cap the spend

Only some of these are hard stops.

| Layer | Hard stop? | Where |
|---|---|---|
| Daily request cap | **Yes** | IAM & Admin → Quotas, filter service `places.googleapis.com`. Set a per-day override on the Autocomplete and Get Place methods. Maps Platform has no daily limit by default. |
| Per-minute cap | **Yes** | Google Maps Platform → Quotas. Limits burst damage. |
| Billing kill switch | **Yes** | Billing → Budgets & alerts, with a Pub/Sub topic wired to a Cloud Function that disables billing. A budget *alert* on its own stops nothing. |
| Client guards | No | Built in: 300 ms debounce, 3-character minimum, session tokens, the SQLite details cache, and a local daily counter (`EXPO_PUBLIC_PLACES_DAILY_LIMIT`, default 200 requests) that disables search with a message. |

Cost per added pin: Autocomplete is free inside a session that ends in a Details
call. Then two Details calls (English, then local script), both billed at the Pro
tier because of `displayName`. A place already in the cache costs nothing.

## 4. Configure the app

Create `.env.local` in the repo root. It is gitignored; never commit the key.

```bash
EXPO_PUBLIC_PLACES_PROVIDER=google
EXPO_PUBLIC_GOOGLE_PLACES_KEY=your-key
# optional
EXPO_PUBLIC_PLACES_DAILY_LIMIT=200
EXPO_PUBLIC_ANDROID_CERT_SHA1=AA:BB:...
```

`EXPO_PUBLIC_*` values are inlined into the bundle at build time, so restart the
dev server (or rebuild) after changing them. Remove `EXPO_PUBLIC_PLACES_PROVIDER`
to go back to the fixture places.

## 5. Check it

Add one pin in Vietnam and one in China and confirm the confirm card shows the
local-script name and address. Watch the request count on the Quotas page: each
new place should cost a few Autocomplete requests (one per pause in typing) plus
two Details; adding it again should cost only the Autocomplete requests.

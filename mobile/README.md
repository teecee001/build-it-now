# ExoSky native app (Expo)

React Native + Expo SDK 57 (New Architecture is the default and only mode), TypeScript, expo-router.
Lives beside the web app; the web app, its CI (`.github/workflows/ci.yml`) and Vercel are untouched
(root ESLint ignores `mobile/**`; this folder has its own `package.json`/lockfile and its own
workflow, `.github/workflows/mobile.yml`, which only runs when `mobile/` changes).

## Run locally

```bash
cd mobile
npm install
npx expo start          # press i / a for a simulator, w for web
npm run typecheck && npm run lint && npm test
```

Note: Expo Go cannot run Face ID / push in all cases; use a development build (`eas build --profile development`).

## What it uses from the web app

- **Supabase**: same project URL and publishable (anon) key as `src/integrations/supabase/client.ts`
  (public values, no secrets). The auth session is stored in the iOS Keychain / Android Keystore via
  `expo-secure-store` (chunked, because SecureStore values are size-limited).
- **Edge functions** (unchanged contracts): `wallet-operation` (send, same body + idempotency key,
  same refresh-and-retry on auth failure), `market-data` (crypto prices/rates), `ai-advisor` (Exo).
- **Copy**: strings are the web app's own. `src/lib/formatTransaction.ts` is a verbatim copy.

## Push notifications

`src/lib/push.ts` asks permission and gets an Expo push token, but **does not store it**: the database
has no push-token table. To send pushes later, Maurice would add (migration, his call):

```sql
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "own tokens" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

plus an edge function that calls the Expo Push API, and `eas init` so a `projectId` exists.

## Identifiers

`app.json` uses bundle id / package **`com.exosky.app`**. Change both before the first store build
if you want a different one (they cannot be changed after publishing).

## Shipping (TestFlight + Play internal track)

1. Accounts (Maurice): Apple Developer Program ($99/yr), Google Play Console ($25 one-time), free Expo account.
2. `npm i -g eas-cli && eas login` then `eas init` (links the project, writes `extra.eas.projectId`).
3. `eas build --platform ios --profile production` (EAS creates certificates/profiles after Apple sign-in).
4. `eas build --platform android --profile production` (EAS generates the upload keystore).
5. `eas submit --platform ios --latest` → TestFlight.
6. Play: create the app in Play Console, upload the first AAB manually once, add a service-account
   JSON key, then `eas submit --platform android --latest` (profile `production` targets the
   `internal` track as a draft).

# ExoSky

The everything finance app — multi-currency wallets, P2P, markets, forecasts, and an AI advisor.

**Live:** https://exosky-beta.vercel.app  
**Repo:** https://github.com/teecee001/build-it-now

## Stack

- Vite + React + TypeScript + Tailwind + shadcn/ui
- Supabase (auth, database, edge functions)
- Hosted on Vercel

## Local development

```sh
npm i
cp .env.example .env
# fill VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
npm run dev
```

## Environment

Set the same `VITE_SUPABASE_*` values in Vercel → Project → Settings → Environment Variables, then redeploy.

In the Supabase project, add these Auth redirect URLs:

- `https://exosky-beta.vercel.app/**`
- `http://localhost:8080/**`

Enable the Google provider if you want Continue with Google.

## Edge functions

See `supabase/functions/` (Stripe checkout, wallet ops, AI advisor).

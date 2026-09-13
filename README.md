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

### Vercel (frontend)

Set `VITE_SUPABASE_*` in Project → Settings → Environment Variables.

To enable the AI advisor, also set **one** of:

- `XAI_API_KEY` (preferred — uses grok-4.3)
- `OPENAI_API_KEY`
- `LOVABLE_API_KEY`

### Supabase (edge functions)

Dashboard → Project Settings → Edge Functions → Secrets. Add the same AI key (`XAI_API_KEY` preferred), plus:

- `STRIPE_SECRET_KEY` (already required for Pro checkout)

Auth → URL configuration, add:

- `https://exosky-beta.vercel.app/**`
- `http://localhost:8080/**`

Enable the Google provider if you want Continue with Google.

## Edge functions

`supabase/functions/` hosts Stripe checkout, wallet ops, identity, and the AI advisor.
The live site also calls `/api/ai-advisor` on Vercel so the advisor can ship without a separate Supabase function deploy.

# ExoSky — Project Structure

Finance app (not a currency-converter demo). Live: https://exosky-beta.vercel.app

```
build-it-now/
├── api/                          # Vercel edge routes
│   └── ai-advisor.ts              # AI advisor (XAI / OpenAI / Lovable)
├── supabase/
│   ├── functions/                 # Edge functions (wallet, Stripe, markets, KYC, MCP)
│   └── migrations/                # Postgres schema + RPCs (waitlist, admin, wallets)
├── src/
│   ├── pages/                     # Route-level screens (see below)
│   ├── components/                # Feature UI + shadcn primitives (components/ui)
│   ├── components/layout/         # Signed-in AppLayout (sidebar / chrome)
│   ├── hooks/                     # Auth, wallet, markets, geo, admin, …
│   ├── integrations/supabase/     # Client + generated DB types
│   ├── constants/                 # Currencies and static config
│   ├── lib/                       # Shared helpers
│   ├── App.tsx                    # Router, auth gate, providers
│   └── main.tsx
├── .env.example                 # Placeholders only — never commit .env
└── README.md
```

## Routes

**Public**

| Path | Page |
|---|---|
| `/` | Landing |
| `/auth` | Sign in / sign up |
| `/terms` `/privacy` `/disclosures` `/compliance` | Legal |
| `/oauth/consent` | OAuth consent for MCP clients |

**Signed-in (ProtectedRoute + AppLayout; country onboarding first)**

Dashboard, wallet, send, deposit, activity, rewards, card, bills, markets, forecasts, AI advisor, savings, referrals, premium, settings, KYC (`/verify`), analytics, QR pay, recurring, multi-currency, stocks, notifications.

**Admin (`/admin`)**

Requires a signed-in session at the router, then `has_role(..., admin)` inside the page. Country onboarding is skipped so operators can reach the control center. Data mutations go through admin RPCs that re-check the role server-side.

## Auth model

- `BYPASS_AUTH` is `false`.
- `ProtectedRoute` sends anonymous users to `/auth`.
- Admin RPCs (`has_role`, waitlist, user ban/confirm) are `SECURITY DEFINER` and raise `not authorized` for non-admins.

## Backend

- **Supabase Auth + Postgres** with ~40 migrations (wallets, waitlist, founder admin, control center).
- **Edge functions:** `wallet-operation`, `ai-advisor`, `create-checkout`, `customer-portal`, `check-subscription`, `market-data`, `stock-data`, `forecast-data`, `geo-verify`, `verify-identity`, `redeem-referral`, `check-bill-reminders`, `check-rate-alerts`, `mcp`.
- **Stripe** for Pro checkout. **Vercel** hosts the SPA and `/api/ai-advisor`.

## Stack

React 18, TypeScript, Vite, Tailwind, shadcn/ui, React Router, TanStack Query, Recharts / lightweight-charts, Framer Motion.

## Secrets

- Publishable/anon Supabase keys may appear in client code; they are public by design. Row Level Security must stay on.
- Never commit `.env`. Put `XAI_API_KEY` / `STRIPE_SECRET_KEY` in Vercel env vars and Supabase function secrets.

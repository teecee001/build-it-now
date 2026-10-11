# Database tests

These scripts target a **scratch / local Postgres only** (never production).

Prerequisite: all migrations in `supabase/migrations` applied. On a plain Postgres
(not Supabase) first create stand-ins for the Supabase roles and the `auth` schema
(`anon`, `authenticated`, `service_role`, `auth.users`, `auth.uid()`), then apply the
migrations in file-name order.

| File | What it covers |
| --- | --- |
| `p2p_send.test.sql` | `public.p2p_send`: sums constant, repeat key is a no-op, recipient forms (`name`, `@name`, any case, email), unknown recipient, insufficient funds, self-send, invalid amounts, non-USD wallet creation, ambiguous handle, unique handle index, privileges (service_role only), `transfer_funds` locked down. Runs in one transaction and rolls back. |
| `p2p_send_concurrency.py` | 40 parallel sends from an under-funded wallet, 20 parallel calls with one idempotency key, 30 parallel opposite-direction transfers. Commits and then deletes its 3 fake users. |

```
psql "$SCRATCH_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/p2p_send.test.sql
PG_DSN="$SCRATCH_DB_URL" python3 supabase/tests/p2p_send_concurrency.py
```

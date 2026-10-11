-- ============================================================================
-- Atomic peer-to-peer send.
--
-- Problem: the wallet-operation "send" case only debited the sender. It never
-- looked up or credited the recipient, ignored update/insert errors, and was
-- not atomic or safe against concurrent requests, so a "send" destroyed money.
--
-- This migration:
--   1. Normalises profile handles to lowercase (duplicate-safe, see below).
--   2. Adds a UNIQUE index on lower(handle).
--   3. Ensures the idempotency table exists.
--   4. Creates public.p2p_send(...) - one SECURITY DEFINER function that debits
--      the sender, credits the recipient and writes both ledger rows in a single
--      transaction. Callable by service_role only (the edge function derives the
--      sender id from the verified JWT; the browser can never call it directly).
--   5. Revokes direct browser access to the older, unused transfer_funds RPC,
--      which has the same class of problems (case-sensitive handle match,
--      idempotency race, swallowed errors, different ledger semantics).
--
-- The whole file is safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Handle normalisation
--
-- Duplicate policy (documented choice): handles are compared case-insensitively.
-- If several profiles collide once lowercased, the one already stored in
-- lowercase keeps the plain handle (otherwise the OLDEST by created_at, then id)
-- and every other one gets a deterministic
-- suffix "_" + the first 6 hex chars of its user id (extended if that would still collide),
-- e.g. "@bob" -> "@bob_1a2b3c".
-- Nothing is deleted and the migration never fails because of duplicates. A
-- NOTICE lists each handle that was changed so the owner can review them.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  n int := 0;
  k int;
  v_target text;
  v_hex text;
BEGIN
  FOR r IN
    SELECT
      id,
      handle,
      lower(btrim(handle)) AS lh,
      row_number() OVER (
        PARTITION BY lower(btrim(handle))
        ORDER BY (handle = lower(btrim(handle))) DESC, created_at, id
      ) AS rn
    FROM public.profiles
    WHERE handle IS NOT NULL AND btrim(handle) <> ''
    ORDER BY 3, 4
  LOOP
    v_target := r.lh;
    IF r.rn > 1 THEN
      -- Deterministic suffix: "_" + the first k hex chars of the user id, growing k
      -- (6..32) until the result collides with no other profile's handle.
      v_hex := replace(r.id::text, '-', '');
      FOR k IN 6..32 LOOP
        v_target := r.lh || '_' || substr(v_hex, 1, k);
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE lower(p.handle) = v_target AND p.id <> r.id
        );
      END LOOP;
    END IF;
    IF r.handle IS DISTINCT FROM v_target THEN
      UPDATE public.profiles SET handle = v_target WHERE id = r.id;
      n := n + 1;
      RAISE NOTICE 'handle normalised for %: % -> %', r.id, r.handle, v_target;
    END IF;
  END LOOP;
  RAISE NOTICE 'p2p_send: % profile handle(s) changed', n;
END
$$;

-- Empty / whitespace-only handles cannot be addressed; store NULL so they never
-- collide with each other under the unique index.
UPDATE public.profiles SET handle = NULL WHERE handle IS NOT NULL AND btrim(handle) = '';

-- ---------------------------------------------------------------------------
-- 2. Case-insensitive uniqueness. Fails with a clear unique-violation message
--    only if the suffixed handles above somehow still collide (practically
--    impossible); nothing is half-applied in that case when run in one
--    transaction (the SQL editor does this).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_key
  ON public.profiles (lower(handle));

-- ---------------------------------------------------------------------------
-- 3. Idempotency table (same shape as the one created by the earlier
--    transfer_funds migration, created here too so this file is self-contained).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transfer_idempotency (
  key text NOT NULL,
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE public.transfer_idempotency ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.transfer_idempotency TO service_role;

-- ---------------------------------------------------------------------------
-- 4. p2p_send
--
-- Returns the sender-side transaction id. Re-running with the same
-- (sender, idempotency key) returns that same id and moves no money.
--
-- Money columns: wallets.balance is in the wallet's own currency. Ledger rows
-- (transactions.amount) hold the USD value with currency = 'USD', exactly like
-- the previous "send" implementation; the native currency and amount are kept
-- in metadata (currency, original_amount).
--
-- Error codes (SQLSTATE) the edge function may show to the user:
--   22023 invalid input / self-send / ambiguous recipient
--   P0002 recipient or sender wallet not found
--   23514 insufficient balance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.p2p_send(
  p_sender uuid,
  p_recipient text,
  p_currency text,
  p_amount numeric,
  p_usd_amount numeric,
  p_description text,
  p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amt numeric;
  v_usd numeric;
  v_cur text;
  v_key text;
  v_input text;
  v_norm text;
  v_ids uuid[];
  v_rec uuid;
  v_tx uuid;
  v_rx uuid := gen_random_uuid();
  v_existing uuid;
  v_bal numeric;
  v_sender_found boolean := false;
  v_rows int;
  w record;
  v_sender_label text;
  v_rec_label text;
  v_desc_send text;
  v_desc_recv text;
  v_meta jsonb;
BEGIN
  -- ---- input validation ---------------------------------------------------
  IF p_sender IS NULL THEN
    RAISE EXCEPTION 'Sender is required' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'Amount must be a positive, finite number' USING ERRCODE = '22023';
  END IF;
  v_amt := round(p_amount, 8);
  IF v_amt <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive, finite number' USING ERRCODE = '22023';
  END IF;

  v_cur := upper(btrim(coalesce(p_currency, '')));
  IF v_cur !~ '^[A-Z0-9]{2,10}$' THEN
    RAISE EXCEPTION 'Invalid currency' USING ERRCODE = '22023';
  END IF;

  IF v_cur = 'USD' THEN
    v_usd := v_amt;
  ELSE
    IF p_usd_amount IS NULL OR p_usd_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'USD equivalent is required for non-USD transfers' USING ERRCODE = '22023';
    END IF;
    v_usd := round(p_usd_amount, 8);
    IF v_usd <= 0 THEN
      RAISE EXCEPTION 'USD equivalent must be positive' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_key := btrim(coalesce(p_idempotency_key, ''));
  IF v_key = '' OR length(v_key) > 128 THEN
    RAISE EXCEPTION 'A valid idempotency key is required' USING ERRCODE = '22023';
  END IF;

  v_input := btrim(coalesce(p_recipient, ''));
  IF v_input = '' OR length(v_input) > 254 THEN
    RAISE EXCEPTION 'Recipient is required' USING ERRCODE = '22023';
  END IF;

  -- ---- replay? return the original result, move nothing ---------------------
  SELECT transaction_id INTO v_existing
    FROM public.transfer_idempotency
   WHERE user_id = p_sender AND key = v_key;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- ---- resolve recipient ----------------------------------------------------
  -- Email: an '@' that is not the first character, followed by a '.' somewhere
  -- after it. Otherwise it is a handle ("name", "@name", any case).
  IF position('@' IN v_input) > 1
     AND position('.' IN substr(v_input, position('@' IN v_input) + 1)) > 0 THEN
    SELECT array_agg(id) INTO v_ids
      FROM auth.users
     WHERE lower(email) = lower(v_input);
  ELSE
    v_norm := lower(ltrim(v_input, '@'));
    IF v_norm = '' THEN
      RAISE EXCEPTION 'Recipient is required' USING ERRCODE = '22023';
    END IF;
    SELECT array_agg(id) INTO v_ids
      FROM public.profiles
     WHERE lower(handle) IN (v_norm, '@' || v_norm);
  END IF;

  IF v_ids IS NULL OR cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'Recipient not found' USING ERRCODE = 'P0002';
  END IF;
  IF cardinality(v_ids) > 1 THEN
    -- e.g. both "bob" and "@bob" exist as handles; refuse rather than guess.
    RAISE EXCEPTION 'Recipient is ambiguous, please use their email' USING ERRCODE = '22023';
  END IF;
  v_rec := v_ids[1];

  IF v_rec = p_sender THEN
    RAISE EXCEPTION 'You cannot send money to yourself' USING ERRCODE = '22023';
  END IF;

  -- ---- claim the idempotency key (race-safe) --------------------------------
  -- If another transaction is inserting the same key right now this INSERT
  -- waits for it to commit or roll back, then either no-ops (we return the
  -- stored id) or inserts. A later failure rolls this row back with everything
  -- else, so a failed attempt never burns the key.
  v_tx := gen_random_uuid();
  INSERT INTO public.transfer_idempotency (key, user_id, transaction_id)
  VALUES (v_key, p_sender, v_tx)
  ON CONFLICT (user_id, key) DO NOTHING;
  IF NOT FOUND THEN
    SELECT transaction_id INTO v_existing
      FROM public.transfer_idempotency
     WHERE user_id = p_sender AND key = v_key;
    RETURN v_existing;
  END IF;

  -- ---- wallets: create recipient wallet if missing, then lock both ----------
  INSERT INTO public.wallets (user_id, currency, balance, savings_balance)
  VALUES (v_rec, v_cur, 0, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;

  -- Deterministic lock order (by user_id) so two opposite transfers between the
  -- same pair of users cannot deadlock.
  FOR w IN
    SELECT user_id, balance
      FROM public.wallets
     WHERE currency = v_cur AND user_id IN (p_sender, v_rec)
     ORDER BY user_id
       FOR UPDATE
  LOOP
    IF w.user_id = p_sender THEN
      v_sender_found := true;
      v_bal := w.balance;
    END IF;
  END LOOP;

  IF NOT v_sender_found THEN
    RAISE EXCEPTION 'You have no % wallet', v_cur USING ERRCODE = 'P0002';
  END IF;
  IF v_bal < v_amt THEN
    RAISE EXCEPTION 'Insufficient % balance', v_cur USING ERRCODE = '23514';
  END IF;

  -- ---- move the money -------------------------------------------------------
  UPDATE public.wallets
     SET balance = balance - v_amt, updated_at = now()
   WHERE user_id = p_sender AND currency = v_cur;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Debit failed' USING ERRCODE = 'XX000';
  END IF;

  UPDATE public.wallets
     SET balance = balance + v_amt, updated_at = now()
   WHERE user_id = v_rec AND currency = v_cur;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Credit failed' USING ERRCODE = 'XX000';
  END IF;

  -- ---- ledger rows (the existing notify_on_transaction trigger fires for each,
  --      giving both parties a notification) -----------------------------------
  SELECT handle INTO v_sender_label FROM public.profiles WHERE id = p_sender;
  v_sender_label := coalesce(v_sender_label, 'another user');
  SELECT handle INTO v_rec_label FROM public.profiles WHERE id = v_rec;
  v_rec_label := coalesce(v_rec_label, v_input);

  v_desc_send := coalesce(
    nullif(left(btrim(coalesce(p_description, '')), 300), ''),
    format('Sent %s %s to %s', to_char(round(v_amt, 2), 'FM999,999,999,999,990.00'), v_cur, v_rec_label)
  );
  v_desc_recv := format('Received %s %s from %s', to_char(round(v_amt, 2), 'FM999,999,999,999,990.00'), v_cur, v_sender_label);

  v_meta := jsonb_build_object(
    'currency', v_cur,
    'original_amount', v_amt,
    'p2p', true,
    'transfer_id', v_tx
  );

  INSERT INTO public.transactions (id, user_id, type, amount, currency, description, recipient, status, metadata)
  VALUES (v_tx, p_sender, 'send', -v_usd, 'USD', v_desc_send, v_rec_label, 'completed', v_meta);

  INSERT INTO public.transactions (id, user_id, type, amount, currency, description, recipient, status, metadata)
  VALUES (v_rx, v_rec, 'receive', v_usd, 'USD', v_desc_recv, v_sender_label, 'completed', v_meta);

  RETURN v_tx;
END;
$$;

-- Service role only. Never callable from the browser or anonymous clients.
REVOKE ALL ON FUNCTION public.p2p_send(uuid, text, text, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.p2p_send(uuid, text, text, numeric, numeric, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.p2p_send(uuid, text, text, numeric, numeric, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.p2p_send(uuid, text, text, numeric, numeric, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Retire direct browser access to the older transfer_funds RPC (unused by the
--    app; exact-case handle match, idempotency race, different ledger units).
--    Rollback: GRANT EXECUTE ON FUNCTION public.transfer_funds(text, numeric, text, text, text) TO authenticated;
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.transfer_funds(text,numeric,text,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.transfer_funds(text, numeric, text, text, text) FROM PUBLIC, anon, authenticated';
  END IF;
END
$$;

-- Make PostgREST pick up the new function immediately (Supabase also does this on DDL).
NOTIFY pgrst, 'reload schema';

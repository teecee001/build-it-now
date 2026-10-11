-- ============================================================================
-- ONE-OFF, MANUAL: give back the $1.00 that the broken "send" removed from
-- edwinmaurice11@gmail.com during the 2026-10-11 test transfer to @exoskydemo.
--
-- Run it in the Supabase SQL editor AFTER applying
-- 20261011221500_p2p_send_atomic.sql. It is NOT a migration and is not run
-- automatically.
--
-- What it does (in one transaction, safe to run twice):
--   * finds the orphaned send row: type 'send', amount -1, recipient '@exoskydemo',
--     written by the old code (no metadata.transfer_id), for that user;
--   * stops with a clear message unless exactly one such row exists and it has
--     not been refunded yet;
--   * credits $1.00 back to the user's USD wallet and writes a 'deposit' ledger
--     row ("Refund: ...") that references the original row, so the history
--     balances and a notification is created by the existing trigger.
-- The @exoskydemo account was never credited, so nothing is taken from it.
-- ============================================================================
DO $$
DECLARE
  v_user uuid;
  v_orphan uuid;
  v_n int;
  v_rows int;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = 'edwinmaurice11@gmail.com';
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'user edwinmaurice11@gmail.com not found; nothing changed';
  END IF;

  SELECT count(*), min(id::text)::uuid INTO v_n, v_orphan
    FROM public.transactions t
   WHERE t.user_id = v_user
     AND t.type = 'send'
     AND t.amount = -1
     AND lower(coalesce(t.recipient, '')) = '@exoskydemo'
     AND t.metadata->>'transfer_id' IS NULL;

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 orphaned $1 send to @exoskydemo, found %; nothing changed. Inspect public.transactions manually.', v_n;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions r
     WHERE r.user_id = v_user AND r.metadata->>'refund_of' = v_orphan::text
  ) THEN
    RAISE NOTICE 'already refunded; nothing changed';
    RETURN;
  END IF;

  UPDATE public.wallets
     SET balance = balance + 1, updated_at = now()
   WHERE user_id = v_user AND currency = 'USD';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'USD wallet not found; nothing changed';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, currency, description, status, metadata)
  VALUES (v_user, 'deposit', 1, 'USD',
          'Refund: test transfer to @exoskydemo that was not delivered',
          'completed',
          jsonb_build_object('refund_of', v_orphan, 'reason', 'p2p_send_fix'));

  RAISE NOTICE 'refunded $1.00 for orphaned send %', v_orphan;
END
$$;

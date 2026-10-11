-- ============================================================================
-- Tests for public.p2p_send (migration 20261011221500_p2p_send_atomic.sql)
--
-- RUN ONLY ON A SCRATCH / LOCAL DATABASE with all migrations applied. It creates
-- three fake users and moves fake money, but everything happens inside one
-- transaction that is ROLLED BACK at the end, so nothing is persisted. Do not
-- run it against production.
--
-- How to run (any Postgres client, e.g. psql):
--   psql "$SCRATCH_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/p2p_send.test.sql
-- Each passing check prints "NOTICE:  PASS: <name>". Any failure raises an
-- exception ("FAIL: ...") and aborts the script with a non-zero exit code.
-- ============================================================================
BEGIN;

CREATE FUNCTION pg_temp.check_that(cond boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'PASS: %', label;
END $$;

-- Runs a statement and requires it to fail with the given SQLSTATE.
CREATE FUNCTION pg_temp.expect_error(stmt text, expected_state text, label text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE st text; msg text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS st = RETURNED_SQLSTATE, msg = MESSAGE_TEXT;
    IF st <> expected_state THEN
      RAISE EXCEPTION 'FAIL: % (expected SQLSTATE %, got % / %)', label, expected_state, st, msg;
    END IF;
    RAISE NOTICE 'PASS: % [%: %]', label, st, msg;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL: % (statement succeeded but should have failed)', label;
END $$;

CREATE FUNCTION pg_temp.bal(u uuid, cur text DEFAULT 'USD') RETURNS numeric
LANGUAGE sql AS $$ SELECT coalesce((SELECT balance FROM public.wallets WHERE user_id = u AND currency = cur), -1) $$;

CREATE FUNCTION pg_temp.total(cur text DEFAULT 'USD') RETURNS numeric
LANGUAGE sql AS $$
  SELECT coalesce(sum(balance), 0) FROM public.wallets
   WHERE currency = cur
     AND user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003')
$$;

-- ---- fixtures: 3 users (signup triggers create profile + $25 USD wallet) ----
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.example'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.example'),
  ('cccccccc-0000-0000-0000-000000000003', 'carol@test.example');

UPDATE public.wallets SET balance = 100 WHERE currency = 'USD'
 AND user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003');
UPDATE public.wallets SET balance = 25.5 WHERE currency = 'USD' AND user_id = 'bbbbbbbb-0000-0000-0000-000000000002';

SELECT pg_temp.check_that(
  (SELECT handle FROM public.profiles WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002') = '@bob',
  'fixture: bob has handle @bob');

-- start: alice 100, bob 25.5, carol 100 => total 225.5
SELECT pg_temp.check_that(pg_temp.total() = 225.5, 'fixture: starting total is 225.5');

-- ---- 1. happy path: sums constant, both ledger rows, both notifications ----
DO $$
DECLARE
  a constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  b constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  tx uuid; n_notif_a int; n_notif_b int;
BEGIN
  SELECT count(*) INTO n_notif_a FROM public.notifications WHERE user_id = a;
  SELECT count(*) INTO n_notif_b FROM public.notifications WHERE user_id = b;

  tx := public.p2p_send(a, '@bob', 'USD', 5, 5, NULL, 'key-happy-1');

  PERFORM pg_temp.check_that(pg_temp.bal(a) = 95, 'happy: sender debited 5');
  PERFORM pg_temp.check_that(pg_temp.bal(b) = 30.5, 'happy: recipient credited 5');
  PERFORM pg_temp.check_that(pg_temp.total() = 225.5, 'happy: sum of balances is constant');
  PERFORM pg_temp.check_that(
    (SELECT amount FROM public.transactions WHERE id = tx AND user_id = a AND type = 'send') = -5,
    'happy: sender ledger row type=send amount=-5, id = returned id');
  PERFORM pg_temp.check_that(
    (SELECT count(*) FROM public.transactions WHERE user_id = b AND type = 'receive' AND amount = 5
        AND metadata->>'transfer_id' = tx::text) = 1,
    'happy: recipient ledger row type=receive amount=+5');
  PERFORM pg_temp.check_that(
    (SELECT count(*) FROM public.notifications WHERE user_id = a) = n_notif_a + 1,
    'happy: sender got exactly one notification (existing trigger)');
  PERFORM pg_temp.check_that(
    (SELECT count(*) FROM public.notifications WHERE user_id = b) = n_notif_b + 1,
    'happy: recipient got exactly one notification (existing trigger)');
  PERFORM pg_temp.check_that(
    (SELECT count(*) FROM public.notifications WHERE user_id = b AND title = 'Money Received' AND metadata->>'transaction_id' = tx::text) = 0
    AND (SELECT count(*) FROM public.notifications WHERE user_id = b AND title = 'Money Received') = 1,
    'happy: recipient notification is "Money Received"');
END $$;

-- ---- 2. repeat key: same id, nothing moves, no new rows ----
DO $$
DECLARE
  a constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  b constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  tx1 uuid; tx2 uuid; n_tx int;
BEGIN
  tx1 := (SELECT transaction_id FROM public.transfer_idempotency WHERE user_id = a AND key = 'key-happy-1');
  SELECT count(*) INTO n_tx FROM public.transactions;
  tx2 := public.p2p_send(a, '@bob', 'USD', 5, 5, NULL, 'key-happy-1');
  PERFORM pg_temp.check_that(tx1 = tx2, 'idempotency: repeat key returns the stored transaction id');
  PERFORM pg_temp.check_that(pg_temp.bal(a) = 95 AND pg_temp.bal(b) = 30.5, 'idempotency: repeat key moves no money');
  PERFORM pg_temp.check_that((SELECT count(*) FROM public.transactions) = n_tx, 'idempotency: repeat key writes no new ledger rows');
  -- the same key from a different sender is a different transfer
  PERFORM public.p2p_send(b, '@alice', 'USD', 1, 1, NULL, 'key-happy-1');
  PERFORM pg_temp.check_that(pg_temp.bal(a) = 96 AND pg_temp.bal(b) = 29.5, 'idempotency: keys are scoped per sender');
  PERFORM pg_temp.check_that(pg_temp.total() = 225.5, 'idempotency: sum constant');
END $$;

-- ---- 3. handle / email forms all resolve to bob ----
DO $$
DECLARE
  a constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  b constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  before_b numeric := pg_temp.bal('bbbbbbbb-0000-0000-0000-000000000002');
  forms text[] := ARRAY['bob', '@bob', '@BOB', 'BoB', '  @Bob  ', 'bob@test.example', 'BOB@Test.Example'];
  f text; i int := 0;
BEGIN
  FOREACH f IN ARRAY forms LOOP
    i := i + 1;
    PERFORM public.p2p_send(a, f, 'USD', 1, 1, NULL, 'key-form-' || i);
  END LOOP;
  PERFORM pg_temp.check_that(pg_temp.bal(b) = before_b + 7, 'recipient forms: name, @name, any case, padded, email, email any case all credit bob');
  PERFORM pg_temp.check_that(pg_temp.total() = 225.5, 'recipient forms: sum constant');
END $$;

-- ---- 4. unknown recipient: fails, no balance change, key not burned ----
DO $$
DECLARE
  a constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  before_total numeric := pg_temp.total();
  before_a numeric := pg_temp.bal('aaaaaaaa-0000-0000-0000-000000000001');
  n_tx int; n_idem int;
BEGIN
  SELECT count(*) INTO n_tx FROM public.transactions;
  SELECT count(*) INTO n_idem FROM public.transfer_idempotency;
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@nobody','USD',2,2,NULL,'key-unknown-1')$q$, 'P0002', 'unknown handle fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','ghost@test.example','USD',2,2,NULL,'key-unknown-2')$q$, 'P0002', 'unknown email fails');
  PERFORM pg_temp.check_that(pg_temp.bal(a) = before_a, 'unknown recipient: sender balance unchanged');
  PERFORM pg_temp.check_that(pg_temp.total() = before_total, 'unknown recipient: sum constant');
  PERFORM pg_temp.check_that((SELECT count(*) FROM public.transactions) = n_tx, 'unknown recipient: no ledger rows');
  PERFORM pg_temp.check_that((SELECT count(*) FROM public.transfer_idempotency) = n_idem, 'unknown recipient: idempotency key not consumed');
END $$;

-- ---- 5. insufficient funds / missing wallet: fails and leaves no trace ----
DO $$
DECLARE
  a constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  b constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  before_a numeric := pg_temp.bal('aaaaaaaa-0000-0000-0000-000000000001');
  before_b numeric := pg_temp.bal('bbbbbbbb-0000-0000-0000-000000000002');
  n_tx int;
BEGIN
  SELECT count(*) INTO n_tx FROM public.transactions;
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',1000,1000,NULL,'key-broke-1')$q$, '23514', 'insufficient funds fails');
  PERFORM pg_temp.check_that(pg_temp.bal(a) = before_a AND pg_temp.bal(b) = before_b, 'insufficient: balances unchanged');
  PERFORM pg_temp.check_that((SELECT count(*) FROM public.transactions) = n_tx, 'insufficient: no ledger rows');
  -- exactly the full balance is allowed (>= check), one cent more is not
  PERFORM pg_temp.expect_error(format($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',%s,%s,NULL,'key-broke-2')$q$, before_a + 0.01, before_a + 0.01), '23514', 'balance + 0.01 fails');
  -- no sender wallet in that currency
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','GBP',1,1.3,NULL,'key-broke-3')$q$, 'P0002', 'missing sender wallet fails');
  PERFORM pg_temp.check_that(pg_temp.bal(b, 'GBP') = -1, 'missing sender wallet: no recipient GBP wallet was left behind');
  PERFORM public.p2p_send(a, '@bob', 'USD', before_a, before_a, NULL, 'key-broke-4');
  PERFORM pg_temp.check_that(pg_temp.bal(a) = 0 AND pg_temp.bal(b) = before_b + before_a, 'insufficient: sending the exact full balance works and leaves 0');
  PERFORM pg_temp.check_that(pg_temp.total() = 225.5, 'insufficient: sum constant');
  -- give it back so later tests have money
  PERFORM public.p2p_send(b, '@alice', 'USD', before_a, before_a, NULL, 'key-broke-5');
END $$;

-- ---- 6. self-send ----
DO $$
DECLARE before_total numeric := pg_temp.total();
BEGIN
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@alice','USD',1,1,NULL,'key-self-1')$q$, '22023', 'self-send by handle fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','ALICE@test.example','USD',1,1,NULL,'key-self-2')$q$, '22023', 'self-send by email fails');
  PERFORM pg_temp.check_that(pg_temp.total() = before_total, 'self-send: no change');
END $$;

-- ---- 7. invalid amounts / inputs ----
DO $$
DECLARE before_total numeric := pg_temp.total();
BEGIN
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',0,0,NULL,'key-bad-1')$q$, '22023', 'amount 0 fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',-5,-5,NULL,'key-bad-2')$q$, '22023', 'negative amount fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD','NaN'::numeric,1,NULL,'key-bad-3')$q$, '22023', 'NaN amount fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD','Infinity'::numeric,1,NULL,'key-bad-4')$q$, '22023', 'Infinity amount fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',NULL,1,NULL,'key-bad-5')$q$, '22023', 'NULL amount fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',0.000000001,1,NULL,'key-bad-6')$q$, '22023', 'amount that rounds to 0 fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',1,1,NULL,NULL)$q$, '22023', 'missing idempotency key fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','USD',1,1,NULL,'   ')$q$, '22023', 'blank idempotency key fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','','USD',1,1,NULL,'key-bad-7')$q$, '22023', 'empty recipient fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@','USD',1,1,NULL,'key-bad-8')$q$, '22023', 'recipient "@" alone fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','US D!',1,1,NULL,'key-bad-9')$q$, '22023', 'malformed currency fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send(NULL,'@bob','USD',1,1,NULL,'key-bad-10')$q$, '22023', 'NULL sender fails');
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','@bob','EUR',1,NULL,NULL,'key-bad-11')$q$, '22023', 'non-USD without USD equivalent fails');
  PERFORM pg_temp.check_that(pg_temp.total() = before_total, 'invalid input: no change');
END $$;

-- ---- 8. non-USD: recipient wallet is created, ledger holds USD value ----
DO $$
DECLARE
  a constant uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  b constant uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  tx uuid;
BEGIN
  INSERT INTO public.wallets (user_id, currency, balance, savings_balance) VALUES (a, 'EUR', 10, 0);
  PERFORM pg_temp.check_that(pg_temp.bal(b, 'EUR') = -1, 'EUR: bob has no EUR wallet before');
  tx := public.p2p_send(a, '@bob', 'eur', 2.5, 2.7, NULL, 'key-eur-1');
  PERFORM pg_temp.check_that(pg_temp.bal(a, 'EUR') = 7.5, 'EUR: sender debited 2.5 EUR');
  PERFORM pg_temp.check_that(pg_temp.bal(b, 'EUR') = 2.5, 'EUR: recipient EUR wallet created and credited 2.5');
  PERFORM pg_temp.check_that(pg_temp.total('EUR') = 10, 'EUR: sum constant');
  PERFORM pg_temp.check_that((SELECT amount FROM public.transactions WHERE id = tx) = -2.7, 'EUR: sender ledger holds USD value -2.7');
  PERFORM pg_temp.check_that(
    (SELECT metadata->>'currency' FROM public.transactions WHERE id = tx) = 'EUR', 'EUR: native currency kept in metadata');
  PERFORM pg_temp.check_that(
    (SELECT amount FROM public.transactions WHERE user_id = b AND type = 'receive' AND metadata->>'transfer_id' = tx::text) = 2.7,
    'EUR: recipient ledger holds USD value +2.7');
END $$;

-- ---- 9. ambiguous handle is refused, not guessed ----
DO $$
BEGIN
  -- carol takes the bare handle "bob" while bob is "@bob" (case-insensitive unique index allows both strings)
  UPDATE public.profiles SET handle = 'bob' WHERE id = 'cccccccc-0000-0000-0000-000000000003';
  PERFORM pg_temp.expect_error($q$SELECT public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001','bob','USD',1,1,NULL,'key-amb-1')$q$, '22023', 'ambiguous handle is refused');
  -- email still unambiguous
  PERFORM public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001', 'bob@test.example', 'USD', 1, 1, NULL, 'key-amb-2');
  UPDATE public.profiles SET handle = '@carol' WHERE id = 'cccccccc-0000-0000-0000-000000000003';
END $$;

-- ---- 10. unique index on lower(handle) ----
SELECT pg_temp.expect_error(
  $q$UPDATE public.profiles SET handle = '@BOB' WHERE id = 'cccccccc-0000-0000-0000-000000000003'$q$,
  '23505', 'unique index rejects a case-variant duplicate handle');

-- ---- 11. privileges: service_role only ----
DO $$
DECLARE st text; r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    BEGIN
      EXECUTE format('SET LOCAL ROLE %I', r);
      PERFORM public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001', '@bob', 'USD', 1, 1, NULL, 'key-priv-' || r);
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION 'FAIL: % could execute p2p_send', r;
    EXCEPTION WHEN insufficient_privilege THEN
      EXECUTE 'RESET ROLE';
      RAISE NOTICE 'PASS: % cannot execute p2p_send (42501)', r;
    END;
  END LOOP;
  EXECUTE 'SET LOCAL ROLE service_role';
  PERFORM public.p2p_send('aaaaaaaa-0000-0000-0000-000000000001', '@bob', 'USD', 1, 1, NULL, 'key-priv-service');
  EXECUTE 'RESET ROLE';
  RAISE NOTICE 'PASS: service_role can execute p2p_send';
END $$;

SELECT pg_temp.check_that(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.p2p_send(uuid,text,text,numeric,numeric,text,text)'::regprocedure),
  'p2p_send is SECURITY DEFINER');
SELECT pg_temp.check_that(
  (SELECT 'search_path=public, pg_temp' = ANY (proconfig) FROM pg_proc WHERE oid = 'public.p2p_send(uuid,text,text,numeric,numeric,text,text)'::regprocedure),
  'p2p_send pins search_path');

-- ---- 12. old transfer_funds RPC is no longer callable by the browser role ----
SELECT pg_temp.check_that(
  NOT has_function_privilege('authenticated', 'public.transfer_funds(text,numeric,text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.transfer_funds(text,numeric,text,text,text)', 'EXECUTE'),
  'transfer_funds no longer executable by anon/authenticated');

-- ---- final: conservation across everything above ----
SELECT pg_temp.check_that(pg_temp.total('USD') = 225.5, 'FINAL: total USD across the three users is still 225.5');
SELECT pg_temp.check_that(pg_temp.total('EUR') = 10, 'FINAL: total EUR across the three users is still 10');

ROLLBACK;

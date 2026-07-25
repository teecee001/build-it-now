
-- 1. CHECK CONSTRAINTS — engine-level guardrails
ALTER TABLE public.wallets
  ADD CONSTRAINT wallets_balance_nonneg CHECK (balance >= 0),
  ADD CONSTRAINT wallets_savings_nonneg CHECK (savings_balance >= 0);

ALTER TABLE public.stock_holdings
  ADD CONSTRAINT stock_holdings_shares_nonneg CHECK (shares >= 0);

ALTER TABLE public.crypto_holdings
  ADD CONSTRAINT crypto_holdings_amount_nonneg CHECK (amount >= 0);

ALTER TABLE public.bills
  ADD CONSTRAINT bills_amount_positive CHECK (amount > 0);

-- 2. IDEMPOTENCY TABLE
CREATE TABLE public.transfer_idempotency (
  key text NOT NULL,
  user_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

GRANT SELECT ON public.transfer_idempotency TO authenticated;
GRANT ALL ON public.transfer_idempotency TO service_role;

ALTER TABLE public.transfer_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own idempotency keys"
  ON public.transfer_idempotency FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. ATOMIC TRANSFER FUNCTION
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_to_handle text,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_description text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_sender_handle text;
  v_tx_id uuid;
  v_existing_tx uuid;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: if this (sender, key) already ran, return original tx
  IF p_idempotency_key IS NOT NULL THEN
    SELECT transaction_id INTO v_existing_tx
      FROM public.transfer_idempotency
     WHERE user_id = v_sender AND key = p_idempotency_key;
    IF v_existing_tx IS NOT NULL THEN
      RETURN v_existing_tx;
    END IF;
  END IF;

  -- Resolve recipient by handle
  SELECT id, handle INTO v_recipient, v_sender_handle
    FROM public.profiles
   WHERE handle = p_to_handle
   LIMIT 1;

  IF v_recipient IS NULL THEN
    RAISE EXCEPTION 'Recipient not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_recipient = v_sender THEN
    RAISE EXCEPTION 'Cannot transfer to yourself' USING ERRCODE = '22023';
  END IF;

  -- Lock sender wallet (create if missing shouldn't happen; sender must exist)
  PERFORM 1 FROM public.wallets
    WHERE user_id = v_sender AND currency = p_currency
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender has no % wallet', p_currency USING ERRCODE = 'P0002';
  END IF;

  -- Ensure recipient wallet exists (locked)
  INSERT INTO public.wallets (user_id, currency, balance, savings_balance)
    VALUES (v_recipient, p_currency, 0, 0)
    ON CONFLICT (user_id, currency) DO NOTHING;

  PERFORM 1 FROM public.wallets
    WHERE user_id = v_recipient AND currency = p_currency
    FOR UPDATE;

  -- Debit sender (CHECK constraint prevents negative)
  UPDATE public.wallets
     SET balance = balance - p_amount, updated_at = now()
   WHERE user_id = v_sender AND currency = p_currency;

  -- Credit recipient
  UPDATE public.wallets
     SET balance = balance + p_amount, updated_at = now()
   WHERE user_id = v_recipient AND currency = p_currency;

  -- Sender-side transaction (negative amount)
  INSERT INTO public.transactions (user_id, type, amount, currency, description, recipient, status)
    VALUES (v_sender, 'send', -p_amount, p_currency, p_description, p_to_handle, 'completed')
    RETURNING id INTO v_tx_id;

  -- Recipient-side transaction (positive amount)
  INSERT INTO public.transactions (user_id, type, amount, currency, description, recipient, status)
    VALUES (v_recipient, 'receive', p_amount, p_currency, p_description, p_to_handle, 'completed');

  -- Record idempotency
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.transfer_idempotency (key, user_id, transaction_id)
      VALUES (p_idempotency_key, v_sender, v_tx_id);
  END IF;

  RETURN v_tx_id;
EXCEPTION
  WHEN check_violation THEN
    RAISE EXCEPTION 'Insufficient funds' USING ERRCODE = '23514';
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_funds(text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_funds(text, numeric, text, text, text) TO authenticated;

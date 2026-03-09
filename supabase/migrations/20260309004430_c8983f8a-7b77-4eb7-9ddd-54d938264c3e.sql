
-- Re-add transactions INSERT but block credit-type fabrication
-- Users can only insert send, conversion, bill_payment, purchase, withdrawal types
-- Deposit, welcome_bonus, cashback, interest must come from triggers/service role
CREATE POLICY "Users can insert own transactions (restricted)"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type IN ('send'::transaction_type, 'conversion'::transaction_type, 'bill_payment'::transaction_type, 'purchase'::transaction_type, 'withdrawal'::transaction_type)
);

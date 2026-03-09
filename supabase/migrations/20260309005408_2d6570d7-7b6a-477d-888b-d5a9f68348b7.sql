-- Remove client-side UPDATE capability on wallets
-- Balance changes must now go through wallet-operation edge function (service role)
DROP POLICY IF EXISTS "Users can update own wallets" ON public.wallets;
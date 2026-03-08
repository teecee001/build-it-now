
CREATE TABLE public.crypto_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crypto_code text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  avg_buy_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, crypto_code)
);

ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holdings" ON public.crypto_holdings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holdings" ON public.crypto_holdings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holdings" ON public.crypto_holdings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holdings" ON public.crypto_holdings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_crypto_holdings_updated_at BEFORE UPDATE ON public.crypto_holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

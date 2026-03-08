
CREATE TABLE public.stock_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticker text NOT NULL,
  shares numeric NOT NULL DEFAULT 0,
  avg_buy_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);

ALTER TABLE public.stock_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock holdings" ON public.stock_holdings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stock holdings" ON public.stock_holdings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stock holdings" ON public.stock_holdings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stock holdings" ON public.stock_holdings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_stock_holdings_updated_at BEFORE UPDATE ON public.stock_holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add card format (virtual/physical) and status to cards
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_format TEXT NOT NULL DEFAULT 'virtual';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS card_name TEXT DEFAULT 'My Card';
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT NULL;

-- Account tiers table
CREATE TYPE public.account_tier AS ENUM ('personal', 'pro', 'business', 'bank');

CREATE TABLE public.account_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tier account_tier NOT NULL DEFAULT 'personal',
  daily_transaction_limit NUMERIC NOT NULL DEFAULT 2500,
  monthly_transaction_limit NUMERIC NOT NULL DEFAULT 25000,
  single_transaction_limit NUMERIC NOT NULL DEFAULT 1000,
  atm_daily_limit NUMERIC NOT NULL DEFAULT 500,
  max_cards INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tier"
  ON public.account_tiers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tier"
  ON public.account_tiers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tier"
  ON public.account_tiers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-create tier on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_tiers (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_tier
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tier();

-- Updated_at trigger for account_tiers
CREATE TRIGGER on_tier_updated
  BEFORE UPDATE ON public.account_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
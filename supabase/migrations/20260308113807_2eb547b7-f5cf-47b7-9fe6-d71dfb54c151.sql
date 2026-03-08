-- Referral system tables
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC NOT NULL DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- RLS: Users can insert referrals
CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- RLS: Users can update own referrals
CREATE POLICY "Users can update own referrals"
  ON public.referrals FOR UPDATE TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate a unique referral code for new users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  handle_part TEXT;
BEGIN
  handle_part := COALESCE(
    REPLACE(REPLACE(NEW.handle, '@', ''), ' ', ''),
    split_part((SELECT email FROM auth.users WHERE id = NEW.id), '@', 1)
  );
  code := UPPER(LEFT(handle_part, 6)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  NEW.referral_code := code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_generate_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();
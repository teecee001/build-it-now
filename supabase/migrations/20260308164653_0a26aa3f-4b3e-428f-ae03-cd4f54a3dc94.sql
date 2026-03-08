-- Country registry with feature flags and sanctioned status
CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,              -- ISO 3166-1 alpha-2 (US, GB, NG, etc.)
  name TEXT NOT NULL,
  phone_code TEXT NOT NULL,           -- e.g. "+1", "+44"
  region TEXT NOT NULL,               -- e.g. "North America", "Europe", "Africa"
  currency_code TEXT NOT NULL DEFAULT 'USD',
  is_sanctioned BOOLEAN NOT NULL DEFAULT false,
  is_supported BOOLEAN NOT NULL DEFAULT true,
  features_crypto BOOLEAN NOT NULL DEFAULT true,
  features_stocks BOOLEAN NOT NULL DEFAULT true,
  features_forex BOOLEAN NOT NULL DEFAULT true,
  features_send_money BOOLEAN NOT NULL DEFAULT true,
  features_bill_pay BOOLEAN NOT NULL DEFAULT true,
  features_cards BOOLEAN NOT NULL DEFAULT true,
  features_savings BOOLEAN NOT NULL DEFAULT true,
  features_premium BOOLEAN NOT NULL DEFAULT true,
  max_single_transaction NUMERIC DEFAULT 100000,
  max_daily_transaction NUMERIC DEFAULT 250000,
  requires_enhanced_kyc BOOLEAN NOT NULL DEFAULT false,
  regulatory_notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Everyone can read countries (needed during signup)
CREATE POLICY "Anyone can read countries"
  ON public.countries FOR SELECT
  TO anon, authenticated
  USING (true);

-- User geo-verification records
CREATE TABLE public.user_geo_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL REFERENCES public.countries(code),
  phone_number TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  id_document_type TEXT DEFAULT NULL,       -- passport, national_id, drivers_license
  id_document_verified BOOLEAN NOT NULL DEFAULT false,
  ip_country TEXT DEFAULT NULL,
  browser_country TEXT DEFAULT NULL,
  last_location_check TIMESTAMPTZ DEFAULT NULL,
  location_mismatch BOOLEAN NOT NULL DEFAULT false,
  vpn_detected BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_geo_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own geo verification"
  ON public.user_geo_verification FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own geo verification"
  ON public.user_geo_verification FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own geo verification"
  ON public.user_geo_verification FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add country_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL REFERENCES public.countries(code);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT NULL;
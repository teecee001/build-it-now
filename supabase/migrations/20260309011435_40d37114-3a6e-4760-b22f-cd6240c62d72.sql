
-- Drop the existing permissive "anyone can read" policy
DROP POLICY IF EXISTS "Anyone can read countries" ON public.countries;

-- Create a restrictive policy: only authenticated users can read the full table
CREATE POLICY "Authenticated users can read countries"
ON public.countries
FOR SELECT
TO authenticated
USING (true);

-- Create a public view with only safe fields (no regulatory_notes, is_sanctioned, transaction limits, etc.)
CREATE OR REPLACE VIEW public.countries_public AS
SELECT
  code,
  name,
  currency_code,
  phone_code,
  region,
  is_supported,
  features_crypto,
  features_stocks,
  features_forex,
  features_send_money,
  features_bill_pay,
  features_cards,
  features_savings,
  features_premium
FROM public.countries
WHERE is_sanctioned = false AND is_supported = true;

-- Grant access to the public view for anonymous and authenticated users
GRANT SELECT ON public.countries_public TO anon, authenticated;

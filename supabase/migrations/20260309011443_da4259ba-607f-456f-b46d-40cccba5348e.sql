
-- Fix the security definer view issue by setting it to SECURITY INVOKER
ALTER VIEW public.countries_public SET (security_invoker = on);

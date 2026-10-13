-- Backfill referral codes for any profile created before the generate_referral_code trigger
-- existed (those rows have referral_code = NULL and /referrals showed "Loading..." forever).
-- Idempotent: only touches rows where referral_code IS NULL.
UPDATE public.profiles p
SET referral_code = 'EXO' || UPPER(SUBSTRING(md5(p.id::text || clock_timestamp()::text) FROM 1 FOR 6))
WHERE p.referral_code IS NULL;

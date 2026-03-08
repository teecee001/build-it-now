
-- Backfill missing data for existing user
INSERT INTO public.profiles (id, full_name, handle, referral_code)
SELECT u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  '@' || split_part(u.email, '@', 1),
  UPPER(LEFT(split_part(u.email, '@', 1), 6)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

INSERT INTO public.wallets (user_id, balance, savings_balance, currency)
SELECT u.id, 25.00, 0, 'USD'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id);

INSERT INTO public.account_tiers (user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.account_tiers a WHERE a.user_id = u.id);

INSERT INTO public.cards (user_id, card_number_last4)
SELECT u.id, LPAD(FLOOR(RANDOM() * 10000)::INT::TEXT, 4, '0')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.user_id = u.id);

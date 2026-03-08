
-- Fix search_path on mutable functions
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_card() SET search_path = public;
ALTER FUNCTION public.handle_new_wallet() SET search_path = public;
ALTER FUNCTION public.handle_welcome_bonus() SET search_path = public;

-- Seed data for existing users who signed up before these triggers
INSERT INTO public.profiles (id, full_name, handle)
SELECT u.id, 
  COALESCE(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  '@' || split_part(u.email, '@', 1)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

INSERT INTO public.wallets (user_id, balance, savings_balance, currency)
SELECT u.id, 25.00, 0, 'USD'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id);

INSERT INTO public.transactions (user_id, type, amount, description, status)
SELECT u.id, 'welcome_bonus', 25.00, 'Welcome to X Money — $25 bonus credited', 'completed'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.user_id = u.id AND t.type = 'welcome_bonus');

INSERT INTO public.cards (user_id, card_number_last4)
SELECT u.id, lpad((floor(random() * 10000))::int::text, 4, '0')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.user_id = u.id);

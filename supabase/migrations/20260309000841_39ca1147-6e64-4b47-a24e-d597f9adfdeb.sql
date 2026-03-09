
-- Fix handle_new_tier to handle conflicts
CREATE OR REPLACE FUNCTION public.handle_new_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.account_tiers (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Fix handle_new_wallet to handle conflicts
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id, balance, savings_balance, currency)
  VALUES (NEW.id, 25.00, 0, 'USD')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Fix handle_new_card to handle conflicts  
CREATE OR REPLACE FUNCTION public.handle_new_card()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  last4 text;
BEGIN
  last4 := lpad((floor(random() * 10000))::int::text, 4, '0');
  INSERT INTO public.cards (user_id, card_number_last4) VALUES (NEW.id, last4)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Recreate all triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_tier ON auth.users;
CREATE TRIGGER on_auth_user_tier
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tier();

DROP TRIGGER IF EXISTS on_auth_user_wallet ON auth.users;
CREATE TRIGGER on_auth_user_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

DROP TRIGGER IF EXISTS on_auth_user_card ON auth.users;
CREATE TRIGGER on_auth_user_card
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_card();

DROP TRIGGER IF EXISTS on_auth_user_welcome ON auth.users;
CREATE TRIGGER on_auth_user_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_welcome_bonus();

-- Recreate transaction notification trigger
DROP TRIGGER IF EXISTS on_new_transaction ON public.transactions;
CREATE TRIGGER on_new_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_transaction();

-- Recreate referral code trigger
DROP TRIGGER IF EXISTS on_profile_referral_code ON public.profiles;
CREATE TRIGGER on_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

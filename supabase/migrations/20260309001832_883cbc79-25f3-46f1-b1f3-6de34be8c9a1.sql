
-- Remove ALL duplicate triggers on auth.users, keep only one of each
DROP TRIGGER IF EXISTS on_auth_user_created_card ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_tier ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_welcome_bonus ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_bonus ON auth.users;

-- Remove wrong trigger on profiles table (handle_new_tier expects auth.users NEW.id)
DROP TRIGGER IF EXISTS on_profile_created_tier ON public.profiles;

-- Remove duplicate triggers on profiles
DROP TRIGGER IF EXISTS on_profile_created_generate_referral ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_generate_referral ON public.profiles;

-- Remove duplicate transaction notification triggers
DROP TRIGGER IF EXISTS on_transaction_notify ON public.transactions;
DROP TRIGGER IF EXISTS on_transaction_created ON public.transactions;

-- Now ensure exactly ONE trigger per function on auth.users
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

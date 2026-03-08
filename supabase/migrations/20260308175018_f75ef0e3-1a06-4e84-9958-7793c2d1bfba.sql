
-- Attach all missing triggers to auth.users
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wallet();

CREATE TRIGGER on_auth_user_created_tier
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_tier();

CREATE TRIGGER on_auth_user_created_card
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_card();

CREATE TRIGGER on_auth_user_created_welcome_bonus
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_welcome_bonus();

CREATE TRIGGER on_profile_generate_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

CREATE TRIGGER on_transaction_notify
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_transaction();

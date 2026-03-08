
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  handle text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    '@' || split_part(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  savings_balance numeric NOT NULL DEFAULT 0 CHECK (savings_balance >= 0),
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON public.wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-create wallet on signup (with $25 welcome bonus)
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, savings_balance, currency)
  VALUES (NEW.id, 25.00, 0, 'USD');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_wallet();

-- Transactions table
CREATE TYPE public.transaction_type AS ENUM (
  'deposit', 'withdrawal', 'send', 'receive', 'purchase',
  'cashback', 'interest', 'conversion', 'bill_payment', 'welcome_bonus'
);

CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text,
  recipient text,
  status public.transaction_status NOT NULL DEFAULT 'completed',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-record welcome bonus transaction
CREATE OR REPLACE FUNCTION public.handle_welcome_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (NEW.id, 'welcome_bonus', 25.00, 'Welcome to X Money — $25 bonus credited', 'completed');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_bonus
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_welcome_bonus();

-- Cards table
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number_last4 text NOT NULL DEFAULT '5678',
  expiry_month int NOT NULL DEFAULT 3,
  expiry_year int NOT NULL DEFAULT 2029,
  is_frozen boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  card_type text NOT NULL DEFAULT 'metal',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards"
  ON public.cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON public.cards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON public.cards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-issue card on signup
CREATE OR REPLACE FUNCTION public.handle_new_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last4 text;
BEGIN
  last4 := lpad((floor(random() * 10000))::int::text, 4, '0');
  INSERT INTO public.cards (user_id, card_number_last4) VALUES (NEW.id, last4);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_card
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_card();

-- Bills table
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biller_name text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills"
  ON public.bills FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
  ON public.bills FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
  ON public.bills FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger for wallets
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- FIX 1: Waitlist SELECT — restrict to admins only (no more public email exposure)
-- ============================================================
DROP POLICY IF EXISTS "Check approval status" ON public.waitlist;

-- Allow checking own email approval (needed for login flow) via the existing security definer function check_waitlist_approved
-- Admins can read all waitlist entries
CREATE POLICY "Admins can read waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FIX 2: Account tiers — remove INSERT/UPDATE for users (only service role/triggers)
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own tier" ON public.account_tiers;
DROP POLICY IF EXISTS "Users can update own tier" ON public.account_tiers;

-- ============================================================
-- FIX 3: User geo verification — remove INSERT/UPDATE for users (only service role)
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own geo verification" ON public.user_geo_verification;
DROP POLICY IF EXISTS "Users can update own geo verification" ON public.user_geo_verification;

-- ============================================================
-- FIX 4: Referrals — remove permissive UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;

-- ============================================================
-- FIX 5: Transactions — remove INSERT for authenticated users
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;

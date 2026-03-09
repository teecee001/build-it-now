
-- Drop the overly permissive waitlist INSERT policy
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

-- Recreate with a constraint: inserters cannot set is_approved to true
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (is_approved = false);

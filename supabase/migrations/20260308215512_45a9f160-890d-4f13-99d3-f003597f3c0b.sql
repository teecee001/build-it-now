-- Add approval flag to waitlist
ALTER TABLE public.waitlist ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;

-- Allow public SELECT on email+approval status only (needed for signup check)
DROP POLICY IF EXISTS "No public reads" ON public.waitlist;
CREATE POLICY "Check approval status" ON public.waitlist
  FOR SELECT TO anon, authenticated
  USING (true);

-- Create function to check if email is approved
CREATE OR REPLACE FUNCTION public.check_waitlist_approved(check_email TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.waitlist
    WHERE email = check_email AND is_approved = true
  );
$$;
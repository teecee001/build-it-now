CREATE TABLE public.beta_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'feedback',
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.beta_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.beta_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
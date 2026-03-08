
-- Rate alerts table
CREATE TABLE public.rate_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_currency text NOT NULL DEFAULT 'USD',
  to_currency text NOT NULL,
  target_rate numeric NOT NULL,
  direction text NOT NULL DEFAULT 'above', -- 'above' or 'below'
  is_triggered boolean NOT NULL DEFAULT false,
  triggered_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own alerts" ON public.rate_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON public.rate_alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON public.rate_alerts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON public.rate_alerts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

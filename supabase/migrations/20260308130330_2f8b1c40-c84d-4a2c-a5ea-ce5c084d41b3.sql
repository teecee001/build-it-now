
-- Recurring payments table
CREATE TABLE public.recurring_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipient TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  description TEXT,
  next_payment_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring payments" ON public.recurring_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring payments" ON public.recurring_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring payments" ON public.recurring_payments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring payments" ON public.recurring_payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

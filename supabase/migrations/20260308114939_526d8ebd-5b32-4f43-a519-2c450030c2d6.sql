-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service-side insert policy (for triggers/edge functions)
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify on new transaction
CREATE OR REPLACE FUNCTION public.notify_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_title TEXT;
  notif_type TEXT;
BEGIN
  notif_type := 'transaction';
  
  CASE NEW.type
    WHEN 'deposit' THEN notif_title := 'Deposit Received';
    WHEN 'send' THEN notif_title := 'Money Sent';
    WHEN 'receive' THEN notif_title := 'Money Received';
    WHEN 'cashback' THEN notif_title := 'Cashback Earned';
    WHEN 'welcome_bonus' THEN notif_title := 'Welcome Bonus';
    WHEN 'interest' THEN notif_title := 'Interest Earned';
    WHEN 'bill_payment' THEN notif_title := 'Bill Paid';
    WHEN 'conversion' THEN notif_title := 'Currency Converted';
    ELSE notif_title := 'Transaction';
  END CASE;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    notif_type,
    notif_title,
    COALESCE(NEW.description, notif_title || ' — $' || ABS(NEW.amount)::TEXT),
    jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'tx_type', NEW.type)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_created
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_transaction();
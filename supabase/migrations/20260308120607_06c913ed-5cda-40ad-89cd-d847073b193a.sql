UPDATE public.account_tiers 
SET tier = 'bank', 
    daily_transaction_limit = 250000, 
    monthly_transaction_limit = 2500000, 
    single_transaction_limit = 100000, 
    atm_daily_limit = 25000, 
    max_cards = 50,
    updated_at = now()
WHERE user_id = '740734c5-60bb-4c10-baa8-50a28dc50ec6';
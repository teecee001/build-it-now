
-- Table to store OTP codes for phone verification
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No direct client access - only edge functions (service role) interact with this table
-- Clean up expired codes periodically via index
CREATE INDEX idx_otp_codes_phone ON public.otp_codes (phone_number, verified, expires_at);

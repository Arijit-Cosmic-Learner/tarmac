-- Migration 10: Add columns to public.profiles for subscriptions and passes

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT NULL, -- 'all' | 'role'
  ADD COLUMN IF NOT EXISTS access_role TEXT DEFAULT NULL, -- 'TAM' | 'PSE' | 'Tech Support'
  ADD COLUMN IF NOT EXISTS paid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pass_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT NULL;

-- Index for subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_id ON public.profiles(razorpay_subscription_id);

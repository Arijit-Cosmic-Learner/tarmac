-- Create the webhook_events table to log all incoming Razorpay webhooks
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payment_id TEXT,
    order_id TEXT,
    user_id TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up row level security to allow service role full access
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Full Access"
ON public.webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users with admin override to read events
CREATE POLICY "Admins can view webhook events"
ON public.webhook_events
FOR SELECT
TO authenticated
USING (
  auth.email() = 'mitra.ari99@gmail.com'
);

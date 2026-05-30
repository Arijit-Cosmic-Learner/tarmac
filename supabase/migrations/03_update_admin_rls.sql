-- Migration 03: Update admin RLS policies from mitra.ari99@gmail.com to admin.tarmac@gmail.com

-- =============================================
-- webhook_events table
-- =============================================
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;

CREATE POLICY "Admins can view webhook events"
ON public.webhook_events
FOR SELECT
TO authenticated
USING (
  auth.email() = 'admin.tarmac@gmail.com'
);

-- =============================================
-- profiles table — ensure admin can read all profiles
-- =============================================
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;

CREATE POLICY "Admin full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  auth.email() = 'admin.tarmac@gmail.com'
)
WITH CHECK (
  auth.email() = 'admin.tarmac@gmail.com'
);

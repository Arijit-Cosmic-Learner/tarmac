-- Migration 06: Role-Based Admin Support
-- Introduces a dynamic `is_admin` role column, a database checker function, and updates policies.

-- 1. Add is_admin column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Seed the primary default admin account (admin.tarmac@gmail.com)
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE email = 'admin.tarmac@gmail.com';

-- 3. Create the database checker function (accessible inside RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update webhook_events RLS policy to check is_admin function
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;

CREATE POLICY "Admins can view webhook events"
ON public.webhook_events
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- 5. Update profiles RLS policy to check is_admin function
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;

CREATE POLICY "Admin full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

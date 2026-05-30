-- Migration 08: Safe Candidate Data Reset Function
-- Wipes all candidate progress, profiles, leads, and webhooks while preserving admin credentials.

CREATE OR REPLACE FUNCTION public.clear_candidate_data()
RETURNS VOID AS $$
BEGIN
  -- 1. Delete progress of non-admin users
  DELETE FROM public.user_progress
  WHERE user_id NOT IN (
    SELECT id FROM public.profiles WHERE is_admin = TRUE
  );

  -- 2. Delete webhook events
  DELETE FROM public.webhook_events;

  -- 3. Delete all pre-auth leads
  DELETE FROM public.leads;

  -- 4. Delete candidate auth users who are not administrators
  -- This cascades and deletes their profile records from public.profiles
  DELETE FROM auth.users
  WHERE id NOT IN (
    SELECT id FROM public.profiles WHERE is_admin = TRUE
  );

  -- 5. Delete any remaining non-admin profiles (safety cleanup)
  DELETE FROM public.profiles
  WHERE is_admin = FALSE 
    AND id != '00000000-0000-0000-0000-000000000000';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

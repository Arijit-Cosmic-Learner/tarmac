-- Migration 04: Add dedicated email and phone columns to profiles table
-- This replaces the fragile JSONB-embedded approach

-- =============================================
-- Add dedicated columns
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- =============================================
-- Backfill email from Supabase auth.users
-- (one-time backfill for existing users)
-- =============================================
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

-- =============================================
-- Backfill phone from streak_history JSONB
-- (one-time backfill for existing users who had phone stored in the blob)
-- =============================================
UPDATE public.profiles
SET phone = streak_history->>'phone'
WHERE phone IS NULL
  AND streak_history IS NOT NULL
  AND streak_history->>'phone' IS NOT NULL
  AND streak_history->>'phone' != '';

-- =============================================
-- Add email column to leads table too
-- =============================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email TEXT;

-- =============================================
-- Index for fast lookups
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

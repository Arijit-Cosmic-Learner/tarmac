-- Migration 09: Force Admin Access and Backfill Webhook Logs
-- Run this in your Supabase SQL Editor.

-- 1. Ensure the email column in profiles is backfilled from auth.users for admin
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND u.email = 'admin.tarmac@gmail.com';

-- 2. Force is_admin to TRUE for admin.tarmac@gmail.com by matching their Auth UID
UPDATE public.profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin.tarmac@gmail.com'
);

-- 3. Backfill user_id in webhook_events if it was missed or blank in earlier logs
UPDATE public.webhook_events
SET user_id = COALESCE(
  payload->'payload'->'payment'->'entity'->'notes'->>'userId',
  payload->'payload'->'payment'->'entity'->'notes'->>'user_id',
  payload->'payload'->'payment_link'->'entity'->'notes'->>'userId',
  payload->'payload'->'payment_link'->'entity'->'notes'->>'user_id'
)
WHERE user_id IS NULL;

-- Migration 05: Erase all data and tracking details for admin.tarmac@gmail.com
-- This wipes their progress, profile, and lead records.
-- Next time the admin logs in, a fresh, zeroed-out profile row will be automatically created,
-- and our updated app code will prevent any future tracking.

-- 1. Clean up user progress if any exists
DELETE FROM public.user_progress
WHERE user_id IN (
    SELECT id FROM public.profiles WHERE email = 'admin.tarmac@gmail.com'
);

-- 2. Delete the profile row
DELETE FROM public.profiles 
WHERE email = 'admin.tarmac@gmail.com';

-- 3. Delete any pre-auth lead tracking records matching the email or lead phone (if captured)
DELETE FROM public.leads 
WHERE email = 'admin.tarmac@gmail.com';

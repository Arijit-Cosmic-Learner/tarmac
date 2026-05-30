-- Migration 07: Reset password for admin.tarmac@gmail.com to Superari1256@
-- This updates the encrypted password field in Supabase Auth.
-- Run this in your Supabase SQL Editor as a database-level alternative.

UPDATE auth.users
SET encrypted_password = crypt('Superari1256@', gen_salt('bf', 10))
WHERE email = 'admin.tarmac@gmail.com';

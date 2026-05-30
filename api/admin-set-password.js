// api/admin-set-password.js — Vercel Serverless Function
// Updates the password for admin.tarmac@gmail.com securely using the Service Role Key.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server database configuration key error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. List users to find the correct ID for admin.tarmac@gmail.com
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Failed to list users:', listError);
      return res.status(500).json({ error: 'Failed to list auth users.' });
    }

    const adminUser = users.find(u => u.email === 'admin.tarmac@gmail.com');
    if (!adminUser) {
      return res.status(404).json({ error: 'User admin.tarmac@gmail.com not found.' });
    }

    // 2. Perform administrative password update
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: 'Superari1256@' }
    );

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    console.log('Admin password updated successfully.');
    return res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully for admin.tarmac@gmail.com.' 
    });
  } catch (err) {
    console.error('Set password error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}

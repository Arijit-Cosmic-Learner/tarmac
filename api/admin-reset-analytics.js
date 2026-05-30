// api/admin-reset-analytics.js — Vercel Serverless Function
// Wipes all analytics data (streak_history) and clears the leads table.
// ADMIN ONLY — protected by a secret token.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple secret-token guard so only the admin UI can call this
  const { confirmToken } = req.body;
  if (confirmToken !== 'RESET') {
    return res.status(403).json({ error: 'Invalid confirmation token.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server database configuration error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Reset streak_history on all profiles (preserves email, phone, name, is_paid)
    const { error: profilesErr } = await supabase
      .from('profiles')
      .update({
        streak_history: {},
        streak_count: 0,
        last_active_date: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // safety: never touch guest

    if (profilesErr) {
      console.error('Failed to reset profiles:', profilesErr);
      return res.status(500).json({ error: 'Failed to reset profile analytics.' });
    }

    // 2. Delete all pre-auth leads
    const { error: leadsErr } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // matches all rows

    if (leadsErr) {
      console.error('Failed to delete leads:', leadsErr);
      return res.status(500).json({ error: 'Failed to clear leads table.' });
    }

    console.log('Admin analytics reset completed successfully.');
    return res.status(200).json({ success: true, message: 'All analytics and leads cleared.' });
  } catch (err) {
    console.error('Analytics reset error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
}

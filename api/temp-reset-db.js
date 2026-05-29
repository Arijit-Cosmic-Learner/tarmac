// api/temp-reset-db.js — Temporary Vercel Serverless Function to reset database profile states
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server database configuration missing.' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. List users from auth schema to find the admin user's ID
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const adminUser = users.find(u => u.email === 'mitra.ari99@gmail.com');
    if (!adminUser) {
      return res.status(404).json({ error: 'Could not find admin user mitra.ari99@gmail.com in authentication records.' });
    }

    const adminId = adminUser.id;
    console.log(`Reset script identified Admin ID: ${adminId}`);

    // 2. Revoke Pro access by setting is_paid = false for all profiles except the admin
    const { data: resetProfiles, error: updateError } = await supabase
      .from('profiles')
      .update({ is_paid: false })
      .neq('id', adminId)
      .select();

    if (updateError) throw updateError;

    // 3. Confirm only the admin retains Pro access
    const { data: proProfiles, error: proError } = await supabase
      .from('profiles')
      .select('id, full_name, is_paid')
      .eq('is_paid', true);

    if (proError) throw proError;

    return res.status(200).json({
      success: true,
      message: `Database reset successful. Revoked Pro access for ${resetProfiles.length} profiles.`,
      revoked_profiles: resetProfiles.map(p => ({ id: p.id, name: p.full_name })),
      remaining_pro_profiles: proProfiles.map(p => ({ id: p.id, name: p.full_name })),
    });

  } catch (err) {
    console.error('Database reset failed:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during DB reset.' });
  }
}

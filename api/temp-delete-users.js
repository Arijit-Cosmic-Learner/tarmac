// api/temp-delete-users.js — Vercel Serverless Function
// Temporary endpoint to clear all user records from the database except the admin (mitra.ari99@gmail.com)
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Database configuration missing.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    console.log('Starting full database reset...');

    // 1. Fetch all users from Supabase Auth
    let page = 1;
    let authUsers = [];
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error) {
        throw error;
      }

      const users = data?.users || [];
      if (users.length === 0) break;
      authUsers = authUsers.concat(users);
      page++;
    }

    console.log(`Found ${authUsers.length} total auth users.`);

    // 2. Identify the admin user
    const adminUser = authUsers.find(u => u.email === 'mitra.ari99@gmail.com');
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'Admin user (mitra.ari99@gmail.com) not found in Auth records.',
      });
    }

    const adminId = adminUser.id;
    const deletedAuthUsers = [];
    const deletedProfiles = [];
    const deletedProgress = [];

    // 3. Loop through auth users and clean up
    for (const u of authUsers) {
      if (u.id === adminId) {
        // Admin: Reset progress, profile, and set is_paid to false for testing
        console.log(`Resetting admin user profile: ${u.email} (${u.id})`);
        
        // Clear progress
        const { error: progErr } = await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', adminId);
        
        if (progErr) console.warn('Admin progress delete warning:', progErr);

        // Reset profile state
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            is_paid: false,
            streak_count: 0,
            last_active_date: null,
            streak_history: {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', adminId);

        if (profErr) console.warn('Admin profile reset warning:', profErr);
        continue;
      }

      // Non-admin: Delete all database records and then auth account
      console.log(`Deleting candidate: ${u.email} (${u.id})`);

      // Delete progress
      const { error: progErr } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', u.id);
      if (!progErr) deletedProgress.push(u.id);

      // Delete profile
      const { error: profErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', u.id);
      if (!profErr) deletedProfiles.push(u.id);

      // Delete Auth user
      const { error: authErr } = await supabase.auth.admin.deleteUser(u.id);
      if (!authErr) deletedAuthUsers.push(u.email);
    }

    // 4. Clean up any orphaned records in tables not linked to adminId
    const { error: orphanProgErr } = await supabase
      .from('user_progress')
      .delete()
      .neq('user_id', adminId);
    if (orphanProgErr) console.warn('Orphaned progress delete warning:', orphanProgErr);

    const { error: orphanProfErr } = await supabase
      .from('profiles')
      .delete()
      .neq('id', adminId);
    if (orphanProfErr) console.warn('Orphaned profile delete warning:', orphanProfErr);

    return res.status(200).json({
      success: true,
      message: 'Database reset completed successfully.',
      admin: {
        email: adminUser.email,
        id: adminId,
        status: 'reset_to_unpaid_free_tier',
      },
      deleted: {
        auth_users: deletedAuthUsers,
        profiles_count: deletedProfiles.length,
        progress_records_count: deletedProgress.length,
      },
    });

  } catch (err) {
    console.error('Reset database failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during DB reset.',
    });
  }
}

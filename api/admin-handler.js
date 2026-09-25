// api/admin-handler.js — Unified Vercel Serverless Function
// Consolidates backfill, reset-analytics, set-password, and clean-user to stay within Vercel Hobby plan limits.

import { createClient } from '@supabase/supabase-js';

// Helper function to read raw body if needed (mostly not needed here as Vercel parses JSON bodies automatically)
export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;
  
  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server database configuration key error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const logs = [];

  try {
    // ────────────────────────────────────────────────────────────────────────
    // Action 1: Backfill & Repair Webhook Logs
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'backfill') {
      const token = req.query.token || req.body?.token || req.body?.confirmToken;
      if (token !== 'BACKFILL') {
        return res.status(403).json({ error: 'Unauthorized: Invalid token parameter.' });
      }

      logs.push(`Starting admin verification and webhook logs backfill...`);

      // Resolve auth user ID for admin.tarmac@gmail.com
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);

      const adminUser = users.find(u => u.email === 'admin.tarmac@gmail.com');
      if (!adminUser) {
        logs.push(`WARNING: Auth user admin.tarmac@gmail.com not found.`);
      } else {
        logs.push(`Found admin auth user: ID = ${adminUser.id}`);
        // Create/Update profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', adminUser.id).maybeSingle();
        if (!profile) {
          await supabase.from('profiles').insert({
            id: adminUser.id,
            email: 'admin.tarmac@gmail.com',
            full_name: 'System Administrator',
            is_admin: true,
            updated_at: new Date().toISOString()
          });
          logs.push(`Successfully created admin profile.`);
        } else {
          await supabase.from('profiles').update({
            email: 'admin.tarmac@gmail.com',
            is_admin: true,
            updated_at: new Date().toISOString()
          }).eq('id', adminUser.id);
          logs.push(`Successfully forced is_admin=true on admin profile.`);
        }
      }

      // Fetch profiles & webhook logs to match
      const { data: allProfiles } = await supabase.from('profiles').select('id, email, phone');
      const { data: emptyWebhooks } = await supabase.from('webhook_events').select('*');

      logs.push(`Fetched ${allProfiles?.length || 0} profiles and ${emptyWebhooks?.length || 0} webhook events for matching`);

      let updatedCount = 0;
      for (const event of (emptyWebhooks || [])) {
        let resolvedUserId = event.user_id;
        const payload = event.payload || {};
        const paymentEntity = payload.payload?.payment?.entity;
        const paymentLinkEntity = payload.payload?.payment_link?.entity;
        const subscriptionEntity = payload.payload?.subscription?.entity;

        const notesUserId = paymentEntity?.notes?.userId || paymentEntity?.notes?.user_id || 
                            paymentLinkEntity?.notes?.userId || paymentLinkEntity?.notes?.user_id ||
                            subscriptionEntity?.notes?.userId || subscriptionEntity?.notes?.user_id;

        const payloadEmail = (paymentEntity?.email || paymentLinkEntity?.customer?.email || subscriptionEntity?.customer?.email || '').trim().toLowerCase();
        const payloadContact = (paymentEntity?.contact || paymentLinkEntity?.customer?.contact || subscriptionEntity?.customer?.contact || '').trim();

        if (!resolvedUserId) {
          if (notesUserId && allProfiles.find(p => p.id === notesUserId)) {
            resolvedUserId = notesUserId;
          } else if (payloadEmail && allProfiles.find(p => p.email && p.email.toLowerCase() === payloadEmail)) {
            resolvedUserId = allProfiles.find(p => p.email && p.email.toLowerCase() === payloadEmail).id;
          } else if (payloadContact) {
            const cleanPhone = payloadContact.replace(/[^0-9]/g, '');
            const matched = allProfiles.find(p => {
              if (!p.phone) return false;
              const pp = p.phone.replace(/[^0-9]/g, '');
              return pp && (pp === cleanPhone || pp.endsWith(cleanPhone) || cleanPhone.endsWith(pp));
            });
            if (matched) resolvedUserId = matched.id;
          }
        }

        if (resolvedUserId && resolvedUserId !== event.user_id) {
          const { error: updErr } = await supabase.from('webhook_events').update({ user_id: resolvedUserId }).eq('id', event.id);
          if (!updErr) updatedCount++;
        }
      }

      logs.push(`Completed backfill processing. Webhook rows updated: ${updatedCount}`);
      return res.status(200).json({ success: true, logs, updated_webhooks: updatedCount });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 2: Reset Analytics & Sweeping DB
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'reset-analytics') {
      const confirmToken = req.query.confirmToken || req.body?.confirmToken;
      if (confirmToken !== 'RESET') {
        return res.status(403).json({ error: 'Invalid confirmation token.' });
      }

      logs.push('Triggered database reset analytics action...');

      const { error: rpcErr } = await supabase.rpc('clear_candidate_data');
      if (!rpcErr) {
        return res.status(200).json({ success: true, message: 'All candidate profiles, progress, leads, and webhook events cleared.' });
      }

      logs.push(`RPC failed, running fallback deletion: ${rpcErr.message}`);

      // Fallback
      await supabase.from('profiles').update({
        streak_history: {},
        streak_count: 0,
        last_active_date: null,
      }).neq('id', '00000000-0000-0000-0000-000000000000');

      await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      return res.status(200).json({ success: true, message: 'All analytics and leads reset (fallback mode).', logs });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 3: Set Admin Password
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'set-password') {
      logs.push('Starting password reset for admin.tarmac@gmail.com...');

      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;

      const adminUser = users.find(u => u.email === 'admin.tarmac@gmail.com');
      if (!adminUser) {
        return res.status(404).json({ error: 'User admin.tarmac@gmail.com not found.' });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: 'Superari1256@' }
      );

      if (updateError) throw updateError;

      return res.status(200).json({ success: true, message: 'Password updated successfully for admin.tarmac@gmail.com.' });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 4: Clean Specific User Payments History
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'clean-user') {
      const token = req.query.token || req.body?.token;
      const email = (req.query.email || req.body?.email || '').trim().toLowerCase();

      if (token !== 'CLEAN_USER_PAYMENTS') {
        return res.status(403).json({ error: 'Unauthorized: Invalid token parameter.' });
      }

      if (!email) {
        return res.status(400).json({ error: 'Missing email parameter.' });
      }

      logs.push(`Starting cleanup of payment records for email: ${email}`);

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!profile) {
        return res.status(404).json({ success: false, message: `No profile found for email ${email}.`, logs });
      }

      logs.push(`Found user profile for ${profile.full_name} (ID: ${profile.id})`);

      // Clear payments columns in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_paid: false,
          access_type: null,
          access_role: null,
          paid_until: null,
          pass_created_at: null,
          razorpay_customer_id: null,
          razorpay_subscription_id: null,
          subscription_status: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      logs.push(`Successfully reset all access and subscription columns to NULL for profile.`);

      // Delete webhook logs
      const { error: deleteWebhooksError } = await supabase
        .from('webhook_events')
        .delete()
        .eq('user_id', profile.id);

      if (deleteWebhooksError) {
        logs.push(`WARNING: Failed to delete webhook events: ${deleteWebhooksError.message}`);
      } else {
        logs.push(`Successfully deleted all associated webhook logs for user ID.`);
      }

      return res.status(200).json({
        success: true,
        message: `Successfully cleared payment records and reset profile access to Free for ${email}.`,
        logs
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 5: Create a new Razorpay Plan (₹499)
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'create-razorpay-plan') {
      const token = req.query.token || req.body?.token;
      if (token !== 'CREATE_PLAN') {
        return res.status(403).json({ error: 'Unauthorized: Invalid token parameter.' });
      }

      const KEY_ID = process.env.RAZORPAY_KEY_ID;
      const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

      if (!KEY_ID || !KEY_SECRET) {
        return res.status(500).json({ error: 'Razorpay credentials not configured in Vercel environment variables' });
      }

      const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
      const createPlanRes = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: 'monthly',
          interval: 1,
          item: {
            name: "Tarmac Pro All-Access Monthly Subscription",
            amount: 49900,
            currency: 'INR',
            description: "Unlimited access to all interview prep tracks (Solutions Engineer, Technical Account Manager, and Product Support Engineer), including concept libraries, AI mock interview feedback, and monthly updates."
          }
        }),
      });

      const planData = await createPlanRes.json();
      if (!createPlanRes.ok) {
        return res.status(createPlanRes.status).json({ 
          error: planData.error || 'Failed to create plan',
          details: planData
        });
      }

      return res.status(200).json({
        success: true,
        plan_id: planData.id,
        plan: planData
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 6: Fetch All Subscriptions & Aggregate Analytics from Razorpay
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'fetch-razorpay-subscriptions') {
      const token = req.query.token || req.body?.token;
      if (token !== 'FETCH_ANALYTICS') {
        return res.status(403).json({ error: 'Unauthorized: Invalid token parameter.' });
      }

      const KEY_ID = process.env.RAZORPAY_KEY_ID;
      const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

      if (!KEY_ID || !KEY_SECRET) {
        return res.status(500).json({ error: 'Razorpay credentials not configured' });
      }

      const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
      
      logs.push('Fetching all subscriptions from Razorpay...');
      const rzpRes = await fetch('https://api.razorpay.com/v1/subscriptions?count=100', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        return res.status(rzpRes.status).json({
          error: rzpData.error?.description || 'Failed to fetch subscriptions from Razorpay',
          details: rzpData
        });
      }

      const items = rzpData.items || [];
      const statusCounts = {};
      const planCounts = {};
      let totalPaidCount = 0;
      let estimatedMrr = 0;
      let activeCount = 0;

      const coursePlan = process.env.RAZORPAY_PLAN_COURSE_SPECIFIC || 'plan_Svk4aR9vkzl2JX';

      items.forEach(sub => {
        const status = sub.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        const planId = sub.plan_id || 'unknown';
        planCounts[planId] = (planCounts[planId] || 0) + 1;

        if (sub.paid_count) {
          totalPaidCount += sub.paid_count;
        }

        if (status === 'active') {
          activeCount++;
          const price = planId === coursePlan ? 199 : 499;
          estimatedMrr += price;
        }
      });

      logs.push(`Successfully fetched and aggregated ${items.length} subscriptions.`);

      return res.status(200).json({
        success: true,
        summary: {
          total_subscriptions: items.length,
          active_subscriptions: activeCount,
          estimated_mrr_inr: estimatedMrr,
          total_charges_processed: totalPaidCount,
          status_breakdown: statusCounts,
          plan_breakdown: planCounts
        },
        items: items.map(sub => ({
          id: sub.id,
          status: sub.status,
          plan_id: sub.plan_id,
          customer_id: sub.customer_id,
          total_count: sub.total_count,
          paid_count: sub.paid_count,
          remaining_count: sub.remaining_count,
          charge_at: sub.charge_at,
          current_start: sub.current_start,
          current_end: sub.current_end,
          created_at: sub.created_at
        })),
        logs
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 7: Clean All Candidate Records Except admin.tarmac@gmail.com
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'clean-all-candidates') {
      const token = req.query.token || req.body?.token;
      if (token !== 'CLEAN_ALL') {
        return res.status(403).json({ error: 'Unauthorized: Invalid token parameter.' });
      }

      logs.push('Starting cleanup of all candidate records...');

      // 1. List all auth users
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);

      let deletedCount = 0;
      let skippedCount = 0;

      for (const u of (users || [])) {
        if (u.email === 'admin.tarmac@gmail.com') {
          logs.push(`Skipping admin user: ${u.email}`);
          skippedCount++;
          continue;
        }

        logs.push(`Deleting candidate user: ${u.email} (ID: ${u.id})...`);
        
        // Delete webhooks
        await supabase.from('webhook_events').delete().eq('user_id', u.id);
        
        // Delete profile
        await supabase.from('profiles').delete().eq('id', u.id);
        
        // Delete auth user
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) {
          logs.push(`WARNING: Failed to delete auth user ${u.email}: ${delErr.message}`);
        } else {
          deletedCount++;
        }
      }

      // Fallback: Delete any leftover records in profiles that don't match admin.tarmac@gmail.com
      const { error: profileCleanErr } = await supabase
        .from('profiles')
        .delete()
        .neq('email', 'admin.tarmac@gmail.com');
      
      if (profileCleanErr) {
        logs.push(`Profile cleanup error: ${profileCleanErr.message}`);
      }

      // Clear all leads
      const { error: leadsCleanErr } = await supabase
        .from('leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

      if (leadsCleanErr) {
        logs.push(`Leads cleanup error: ${leadsCleanErr.message}`);
      }

      logs.push(`Cleanup finished. Deleted ${deletedCount} candidate(s), skipped ${skippedCount} admin(s).`);
      return res.status(200).json({ success: true, deletedCount, logs });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 8: Diagnostic Test for User Profile Update Permissions
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'test-profile-update') {
      const email = `test_update_${Date.now()}@yopmail.com`;
      const password = 'TestPassword123!';
      
      logs.push(`Creating test user: ${email}...`);
      const { data: signupData, error: signupErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (signupErr) throw signupErr;
      const userId = signupData.user.id;
      logs.push(`User created with ID: ${userId}`);
      
      // Try to create profile if not automatically created
      const { error: insertErr } = await supabase.from('profiles').insert({
        id: userId,
        email,
        full_name: 'Test Profile Update User'
      });
      if (insertErr) logs.push(`Profile insert status: ${insertErr.message}`);
      
      // Initialize client-side Supabase connection using the user's credentials
      logs.push(`Logging in as test user...`);
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authErr) throw authErr;
      
      // Create user-level client using the same URL and Anon Key
      const userClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlleGZnaXFmZ2tuYnhheGp5Ym5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NzYzNjgsImV4cCI6MjA5NTQ1MjM2OH0.yh5g-YKl-mgeqJT6Mbx36HGaE75YD8HIpCfc3avyZNk', {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      
      await userClient.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token
      });
      
      logs.push(`Attempting to update phone number as authenticated user...`);
      const { data: updateData, error: updateErr } = await userClient
        .from('profiles')
        .update({ phone: '1234567890' })
        .eq('id', userId)
        .select();
        
      if (updateErr) {
        logs.push(`FAIL: Profile update failed with error: ${updateErr.message} (code: ${updateErr.code})`);
      } else {
        logs.push(`SUCCESS: Profile updated successfully! Result: ${JSON.stringify(updateData)}`);
      }
      
      // Clean up user
      logs.push(`Cleaning up test user...`);
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('profiles').delete().eq('id', userId);
      
      return res.status(200).json({ success: true, logs });
    }

    else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error(`admin-handler [${action}] error:`, err);
    return res.status(500).json({ success: false, error: err.message, logs });
  }
}

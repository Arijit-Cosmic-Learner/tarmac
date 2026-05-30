// api/admin-backfill.js — Vercel Serverless Function
// Forces admin role in the profiles table for admin.tarmac@gmail.com and resolves missing user_ids in webhook logs.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Allow GET/POST for easy browser invocation or admin console trigger
  const token = req.query.token || req.body?.token;
  if (token !== 'BACKFILL') {
    return res.status(403).json({ error: 'Unauthorized: Invalid token parameter.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server database configuration key error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const logs = [];
  logs.push(`Starting admin verification and webhook logs backfill at ${new Date().toISOString()}`);

  try {
    // 1. Resolve auth user ID for admin.tarmac@gmail.com
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const adminUser = users.find(u => u.email === 'admin.tarmac@gmail.com');
    if (!adminUser) {
      logs.push(`WARNING: Auth user admin.tarmac@gmail.com not found.`);
    } else {
      logs.push(`Found admin auth user: ID = ${adminUser.id}`);

      // Check if a profile exists for this user ID
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', adminUser.id)
        .maybeSingle();

      if (profError) {
        throw new Error(`Failed checking profile: ${profError.message}`);
      }

      if (!profile) {
        // Create profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: adminUser.id,
            email: 'admin.tarmac@gmail.com',
            full_name: 'System Administrator',
            is_admin: true,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Failed inserting admin profile: ${insertError.message}`);
        }
        logs.push(`Successfully created admin profile with is_admin=true`);
      } else {
        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: 'admin.tarmac@gmail.com',
            is_admin: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', adminUser.id);

        if (updateError) {
          throw new Error(`Failed updating admin profile: ${updateError.message}`);
        }
        logs.push(`Successfully forced is_admin=true on admin profile`);
      }
    }

    // 2. Fetch all profiles to assist with backfill matching
    const { data: allProfiles, error: fetchProfErr } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name');
    
    if (fetchProfErr) {
      throw new Error(`Failed to fetch profiles for matching: ${fetchProfErr.message}`);
    }

    logs.push(`Fetched ${allProfiles.length} profiles for matching`);

    // 3. Fetch webhook events with null or blank user_ids
    const { data: emptyWebhooks, error: webhooksErr } = await supabase
      .from('webhook_events')
      .select('*');

    if (webhooksErr) {
      throw new Error(`Failed to fetch webhook events: ${webhooksErr.message}`);
    }

    logs.push(`Found ${emptyWebhooks.length} total webhook events in the database`);

    let updatedCount = 0;

    for (const event of emptyWebhooks) {
      let resolvedUserId = event.user_id;

      // Extract details from payload
      const payload = event.payload || {};
      const paymentEntity = payload.payload?.payment?.entity;
      const paymentLinkEntity = payload.payload?.payment_link?.entity;

      // Try extract userId / user_id from notes metadata
      const notesUserId = paymentEntity?.notes?.userId || 
                          paymentEntity?.notes?.user_id || 
                          paymentLinkEntity?.notes?.userId || 
                          paymentLinkEntity?.notes?.user_id;

      // Try extract email
      const payloadEmail = (paymentEntity?.email || 
                            paymentLinkEntity?.customer?.email || 
                            '').trim().toLowerCase();

      // Try extract contact
      const payloadContact = (paymentEntity?.contact || 
                              paymentLinkEntity?.customer?.contact || 
                              '').trim();

      if (!resolvedUserId) {
        if (notesUserId) {
          // Verify if it exists in profiles
          const matchedProfile = allProfiles.find(p => p.id === notesUserId);
          if (matchedProfile) {
            resolvedUserId = notesUserId;
            logs.push(`Resolved event ${event.id} to user_id ${resolvedUserId} via payload notes`);
          }
        }

        if (!resolvedUserId && payloadEmail) {
          const matchedProfile = allProfiles.find(p => p.email && p.email.toLowerCase() === payloadEmail);
          if (matchedProfile) {
            resolvedUserId = matchedProfile.id;
            logs.push(`Resolved event ${event.id} to user_id ${resolvedUserId} via payload email (${payloadEmail})`);
          }
        }

        if (!resolvedUserId && payloadContact) {
          // Normalize phone numbers to check (e.g. remove +91 prefix or match last 10 digits)
          const cleanPhone = payloadContact.replace(/[^0-9]/g, '');
          const matchedProfile = allProfiles.find(p => {
            if (!p.phone) return false;
            const profilePhone = p.phone.replace(/[^0-9]/g, '');
            return profilePhone && (profilePhone === cleanPhone || profilePhone.endsWith(cleanPhone) || cleanPhone.endsWith(profilePhone));
          });

          if (matchedProfile) {
            resolvedUserId = matchedProfile.id;
            logs.push(`Resolved event ${event.id} to user_id ${resolvedUserId} via payload contact (${payloadContact})`);
          }
        }
      }

      // If user_id is resolved and differs from DB, or if we want to ensure it is set
      if (resolvedUserId && resolvedUserId !== event.user_id) {
        const { error: updateWebHookErr } = await supabase
          .from('webhook_events')
          .update({ user_id: resolvedUserId })
          .eq('id', event.id);

        if (updateWebHookErr) {
          logs.push(`Failed updating webhook ${event.id}: ${updateWebHookErr.message}`);
        } else {
          updatedCount++;
        }
      }
    }

    logs.push(`Completed backfill processing. Webhook rows updated: ${updatedCount}`);

    return res.status(200).json({
      success: true,
      logs,
      updated_webhooks: updatedCount
    });
  } catch (err) {
    console.error('Backfill error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      logs
    });
  }
}

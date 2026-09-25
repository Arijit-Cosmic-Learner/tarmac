// api/subscription-handler.js — Unified Vercel Serverless Function
// Consolidates cancel, pause, and resume actions to fit within the Vercel Hobby plan limit of 12 functions.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const action = req.query.action || req.body?.action;
  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter.' });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay credentials not configured' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Database credentials not configured' });
  }

  const { subscriptionId, userId } = req.body || {};

  if (!subscriptionId || !userId) {
    return res.status(400).json({ error: 'Missing subscriptionId or userId' });
  }

  const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // ────────────────────────────────────────────────────────────────────────
    // Action 1: Cancel Subscription
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'cancel') {
      console.log(`Cancelling Razorpay subscription: ${subscriptionId} for user ${userId}...`);
      const rzpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancel_at_cycle_end: true
        })
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error('Razorpay subscription cancellation failed:', rzpData);
        return res.status(rzpRes.status).json({
          error: rzpData.error?.description || 'Failed to cancel subscription with Razorpay'
        });
      }

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully at end of current cycle.',
        details: rzpData
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 2: Pause Subscription
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'pause') {
      console.log(`Pausing Razorpay subscription: ${subscriptionId} for user ${userId}...`);
      const rzpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pause_at: 'now'
        })
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error('Razorpay subscription pause failed:', rzpData);
        return res.status(rzpRes.status).json({
          error: rzpData.error?.description || 'Failed to pause subscription with Razorpay'
        });
      }

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return res.status(200).json({
        success: true,
        message: 'Subscription paused successfully.',
        details: rzpData
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // Action 3: Resume Subscription
    // ────────────────────────────────────────────────────────────────────────
    else if (action === 'resume') {
      console.log(`Resuming Razorpay subscription: ${subscriptionId} for user ${userId}...`);
      const rzpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_at: 'now'
        })
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error('Razorpay subscription resume failed:', rzpData);
        return res.status(rzpRes.status).json({
          error: rzpData.error?.description || 'Failed to resume subscription with Razorpay'
        });
      }

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return res.status(200).json({
        success: true,
        message: 'Subscription resumed successfully.',
        details: rzpData
      });
    }

    else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error(`subscription-handler [${action}] error:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

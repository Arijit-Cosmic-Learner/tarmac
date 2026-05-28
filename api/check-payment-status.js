// api/check-payment-status.js — Vercel Serverless Function
// Polls the payment status by checking Supabase first (fast path),
// and falling back to querying the Razorpay API directly (ground truth path).

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, paymentId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    return res.status(500).json({ error: 'Database configuration error' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Step 1: Check Supabase (Fast Path) ────────────────────────────────────
  // If the webhook already successfully received and processed payment.captured,
  // the database will already have is_paid = true.
  try {
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('is_paid')
      .eq('id', userId)
      .maybeSingle();

    if (dbError) {
      console.error('Supabase query error in check-payment-status:', dbError);
    } else if (profile?.is_paid) {
      console.log(`Check status: User ${userId} is already marked as Paid in DB (Webhook completed)`);
      return res.status(200).json({ success: true, isPaid: true });
    }
  } catch (err) {
    console.error('Error fetching profile from Supabase:', err);
  }

  // ── Step 2: Query Razorpay Directly (Fallback Ground Truth Path) ──────────
  // If the webhook is delayed, verify the payment status directly via Razorpay API.
  if (!paymentId) {
    // If no paymentId provided, we can't fall back to Razorpay status query
    return res.status(200).json({ success: true, isPaid: false });
  }

  if (!KEY_ID || !KEY_SECRET) {
    console.error('Missing Razorpay credentials');
    return res.status(500).json({ error: 'Razorpay configuration error' });
  }

  try {
    console.log(`Checking payment status for ${paymentId} directly from Razorpay...`);
    const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    const paymentData = await response.json();

    if (!response.ok) {
      console.error(`Razorpay API payment fetch failed: ${paymentData.error?.description || 'Unknown error'}`);
      return res.status(response.status).json({ error: paymentData.error?.description || 'Failed to fetch payment from Razorpay' });
    }

    const isCaptured = paymentData.status === 'captured' || paymentData.captured === true;
    const paymentUserId = paymentData.notes?.userId;

    if (isCaptured && paymentUserId === userId) {
      console.log(`Razorpay confirms payment ${paymentId} is captured for user ${userId}. Upgrading database...`);

      // Fallback upgrade in case webhook is slow/dropped
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_paid: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profile during fallback Razorpay check:', updateError);
        return res.status(500).json({ error: 'Database update failed' });
      }

      return res.status(200).json({ success: true, isPaid: true });
    }

    return res.status(200).json({ success: true, isPaid: false });
  } catch (err) {
    console.error('Error during fallback Razorpay payment verification:', err);
    return res.status(500).json({ error: 'Internal server error during payment verification' });
  }
}

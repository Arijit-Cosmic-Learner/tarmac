// api/verify-payment.js — Vercel Serverless Function
// Cryptographically verifies the Razorpay payment signature (fraud prevention)
// then marks the user as paid in Supabase

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ── Step 1: Verify signature ──────────────────────────────────────────────
  // As per Razorpay docs: HMAC-SHA256(order_id + "|" + payment_id, secret)
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generated_signature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    console.error('Signature mismatch — possible fraud attempt');
    return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
  }

  // ── Step 2: Upgrade user in Supabase ─────────────────────────────────────
  // Use Service Role Key to bypass Row Level Security
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error: dbError } = await supabase
    .from('profiles')
    .update({
      is_paid: true,
      razorpay_payment_id,
      razorpay_order_id,
      upgraded_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (dbError) {
    console.error('Supabase update error:', dbError);
    return res.status(500).json({ error: 'Payment verified but failed to upgrade account. Contact support.' });
  }

  return res.status(200).json({
    success: true,
    message: 'Payment verified and account upgraded to Pro!',
    payment_id: razorpay_payment_id,
  });
}

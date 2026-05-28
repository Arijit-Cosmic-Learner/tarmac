// api/verify-payment.js — Vercel Serverless Function
// Cryptographically verifies the Razorpay payment signature (fraud prevention)
// then marks the user as paid in Supabase

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_SECRET) {
    console.error('Missing RAZORPAY_KEY_SECRET env var');
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

  // ── Step 2: Return signature verification success ──────────────────────────
  // We no longer update the Supabase profiles table directly from this client-side 
  // endpoint to prevent fraud. Only the webhook (or polling fallback checking Razorpay directly)
  // will perform the DB upgrade.
  return res.status(200).json({
    success: true,
    message: 'Payment signature verified successfully.',
    payment_id: razorpay_payment_id,
  });
}

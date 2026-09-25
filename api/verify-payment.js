// api/verify-payment.js — Vercel Serverless Function
// Cryptographically verifies the Razorpay signature (fraud prevention)
// for both standard orders and monthly subscriptions.

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

  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    razorpay_subscription_id,
    userId 
  } = req.body || {};

  if (!razorpay_payment_id || !razorpay_signature || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // ── Step 1: Verify signature ──────────────────────────────────────────────
  // Orders signature: HMAC-SHA256(order_id + "|" + payment_id, secret)
  // Subscriptions signature: HMAC-SHA256(payment_id + "|" + subscription_id, secret)
  let body = '';
  if (razorpay_subscription_id) {
    body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
  } else {
    if (!razorpay_order_id) {
      return res.status(400).json({ error: 'Missing order_id for standard checkout' });
    }
    body = `${razorpay_order_id}|${razorpay_payment_id}`;
  }

  const generated_signature = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    console.error('Signature mismatch — possible fraud attempt');
    return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });
  }

  console.log(`Payment signature verified successfully for payment: ${razorpay_payment_id}`);

  return res.status(200).json({
    success: true,
    message: 'Payment signature verified successfully.',
    payment_id: razorpay_payment_id,
  });
}

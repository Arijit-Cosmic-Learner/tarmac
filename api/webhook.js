// api/webhook.js — Vercel Serverless Function
// Listens for Razorpay payment webhooks, cryptographically verifies them,
// and marks the user's account as paid in Supabase.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Disable Vercel's automatic body parsing to allow raw signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to read the raw request stream into a buffer
async function readRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!WEBHOOK_SECRET) {
    console.error('Missing RAZORPAY_WEBHOOK_SECRET environment variable.');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configuration environment variables.');
    return res.status(500).json({ error: 'Database configuration error' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      console.warn('Webhook request missing x-razorpay-signature header');
      return res.status(400).json({ error: 'Missing signature header' });
    }

    // Verify signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Webhook signature mismatch — unauthorized access attempt');
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    // Signature verified, parse payload
    const eventData = JSON.parse(rawBody.toString('utf8'));
    console.log(`Razorpay webhook verified: event = ${eventData.event}`);

    // We specifically care about payment.captured
    if (eventData.event === 'payment.captured') {
      const paymentEntity = eventData.payload?.payment?.entity;
      const userId = paymentEntity?.notes?.userId;
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id;

      if (!userId) {
        console.warn(`Payment captured (${paymentId}) but notes.userId was missing. Cannot map to user.`);
        return res.status(200).json({ status: 'ignored_missing_userId' });
      }

      console.log(`Upgrading user ${userId} to Pro via webhook. Payment ID: ${paymentId}, Order ID: ${orderId}`);

      // Initialize privileged Supabase client to bypass Row Level Security
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          is_paid: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (dbError) {
        console.error('Failed to update profile to is_paid=true in Supabase:', dbError);
        return res.status(500).json({ error: 'Failed to update user profile' });
      }

      console.log(`User ${userId} successfully upgraded to Pro via Webhook.`);
    }

    // Always respond with 200 OK to Razorpay to prevent webhook retries
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

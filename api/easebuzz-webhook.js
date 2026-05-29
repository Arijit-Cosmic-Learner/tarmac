// api/easebuzz-webhook.js — Vercel Serverless Function
// Listens for direct server-to-server callbacks from Easebuzz,
// verifies their checksum, and updates user profile in database.
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY = process.env.EASEBUZZ_KEY || '2P17ZFT5KG';
  const SALT = process.env.EASEBUZZ_SALT || 'DAH88Y353Q';
  
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase configurations for webhook.');
    return res.status(500).json({ error: 'Server database configuration error.' });
  }

  const data = req.body || {};
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    status, // 'success' or 'failure'
    udf1,   // this is our userId
    hash,   // checksum from Easebuzz
  } = data;

  if (!txnid || !amount || !status || !hash || !udf1) {
    console.warn('Webhook payload missing key fields:', data);
    return res.status(400).json({ error: 'Missing required validation fields.' });
  }

  // UDFs fallbacks
  const udf2 = data.udf2 || '';
  const udf3 = data.udf3 || '';
  const udf4 = data.udf4 || '';
  const udf5 = data.udf5 || '';
  const udf6 = data.udf6 || '';
  const udf7 = data.udf7 || '';
  const udf8 = data.udf8 || '';
  const udf9 = data.udf9 || '';
  const udf10 = data.udf10 || '';

  // ── Step 1: Verify Cryptographic Hash ──────────────────────────────────────
  // Reverse Hash Sequence: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const hashString = `${SALT}|${status}|${udf10}|${udf9}|${udf8}|${udf7}|${udf6}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${KEY}`;
  
  const computedHash = crypto
    .createHash('sha512')
    .update(hashString)
    .digest('hex');

  if (computedHash !== hash) {
    console.error('Webhook signature mismatch! Computed:', computedHash, 'Received:', hash);
    return res.status(400).json({ error: 'Webhook signature validation failed.' });
  }

  console.log(`Easebuzz webhook signature verified. Transaction ID: ${txnid}, Status: ${status}`);

  // ── Step 2: Update Database if Success ─────────────────────────────────────
  if (status === 'success') {
    const userId = udf1;
    console.log(`Upgrading user ${userId} to Pro via webhook.`);

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          is_paid: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (dbError) {
        console.error('Failed to update profile to paid via Webhook:', dbError);
        return res.status(500).json({ error: 'Database update failed.' });
      }

      console.log(`User ${userId} successfully upgraded via Webhook.`);
    } catch (err) {
      console.error('Database connection exception in webhook:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  // Always return 200 OK to Easebuzz to prevent retries
  return res.status(200).json({ status: 'ok' });
}

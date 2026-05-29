// api/easebuzz-verify-payment.js — Vercel Serverless Function
// Cryptographically verifies the Easebuzz payment signature (hash)
// and updates the user's is_paid status in the database.
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY = process.env.EASEBUZZ_KEY;
  const SALT = process.env.EASEBUZZ_SALT;
  
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase database configuration credentials.');
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
    console.warn('Verify payload missing crucial fields:', data);
    return res.status(400).json({ error: 'Missing required validation fields.' });
  }

  const isMock = hash === 'mock_verified_hash';

  // ── Step 1: Verify Signature / Hash ────────────────────────────────────────
  if (isMock) {
    // Only allow mock validation if credentials are not configured in Vercel
    if (KEY || SALT) {
      console.warn('Blocked mock payment verify attempt since production keys are configured.');
      return res.status(400).json({ error: 'Mock verification not allowed in production environment.' });
    }
    console.log(`Bypassing hash verification: Mock Sandbox Mode active for transaction: ${txnid}`);
  } else {
    // Normal validation with keys
    if (!KEY || !SALT) {
      return res.status(400).json({ error: 'Easebuzz credentials not configured. Please use Mock Sandbox Mode.' });
    }

    const udf2 = data.udf2 || '';
    const udf3 = data.udf3 || '';
    const udf4 = data.udf4 || '';
    const udf5 = data.udf5 || '';
    const udf6 = data.udf6 || '';
    const udf7 = data.udf7 || '';
    const udf8 = data.udf8 || '';
    const udf9 = data.udf9 || '';
    const udf10 = data.udf10 || '';

    // Reverse Hash Sequence: salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = `${SALT}|${status}|${udf10}|${udf9}|${udf8}|${udf7}|${udf6}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${KEY}`;
    
    const computedHash = crypto
      .createHash('sha512')
      .update(hashString)
      .digest('hex');

    if (computedHash !== hash) {
      console.error('Cryptographic signature mismatch! Computed:', computedHash, 'Received:', hash);
      return res.status(400).json({ error: 'Payment signature validation failed.' });
    }
  }

  console.log(`Easebuzz payment verification checksum matched. Transaction ID: ${txnid}, Status: ${status}`);

  // ── Step 2: Update Database if Payment Successful ──────────────────────────
  if (status === 'success') {
    const userId = udf1;
    console.log(`Payment successful for user: ${userId}. Upgrading account to Pro...`);

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
        console.error('Failed to update profile to paid in Supabase:', dbError);
        return res.status(500).json({ error: 'Transaction succeeded but database update failed.' });
      }

      console.log(`User ${userId} successfully upgraded to Pro in database.`);
      return res.status(200).json({
        success: true,
        message: 'Payment verified and Pro status activated.',
        txnid,
      });
    } catch (err) {
      console.error('Database connection exception during verification:', err);
      return res.status(500).json({ error: 'Internal server error during DB upgrade.' });
    }
  }

  return res.status(200).json({
    success: false,
    message: `Payment failed with status: ${status}`,
    txnid,
  });
}

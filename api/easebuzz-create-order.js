// api/easebuzz-create-order.js — Vercel Serverless Function
// Securely initiates a payment with Easebuzz and returns the access_key
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount = '499.00', email, firstname, phone, userId } = req.body || {};

  if (!email || !firstname || !phone || !userId) {
    return res.status(400).json({ error: 'Missing required parameters: email, firstname, phone, and userId are required.' });
  }

  // Create a unique transaction ID
  const txnid = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const productinfo = 'Tarmac Pro';
  const formattedAmount = parseFloat(amount).toFixed(2);

  const KEY = process.env.EASEBUZZ_KEY;
  const SALT = process.env.EASEBUZZ_SALT;
  const ENV = process.env.EASEBUZZ_ENV || 'test';

  // ── MOCK SANDBOX FALLBACK ─────────────────────────────────────────────────
  // If merchant keys are not configured in Vercel, run in Mock mode
  if (!KEY || !SALT) {
    console.log(`Easebuzz credentials not configured. Running in Mock Sandbox Mode for transaction: ${txnid}`);
    return res.status(200).json({
      access_key: `mock_access_key_${Date.now()}`,
      txnid,
      key: 'mock_key',
      env: 'test',
      isMock: true,
      amount: formattedAmount,
      productinfo,
      firstname,
      email,
    });
  }

  // Setup callbacks (redirects are required by Easebuzz even in iframe flow)
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const surl = `${protocol}://${host}/api/easebuzz-verify-payment`;
  const furl = `${protocol}://${host}/pricing`;

  // Concatenation order: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
  const hashString = `${KEY}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${userId}||||||||||${SALT}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  // Prepare urlencoded form parameters
  const formData = new URLSearchParams({
    key: KEY,
    txnid,
    amount: formattedAmount,
    productinfo,
    firstname,
    phone,
    email,
    surl,
    furl,
    hash,
    udf1: userId,
  });

  const apiEndpoint = ENV === 'prod' 
    ? 'https://pay.easebuzz.in/payment/initiateLink' 
    : 'https://testpay.easebuzz.in/payment/initiateLink';

  try {
    console.log(`Initiating Easebuzz payment to ${apiEndpoint} for transaction: ${txnid}`);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok || result.status !== 1) {
      console.error('Easebuzz order initiation failed:', result);
      return res.status(400).json({ error: result.data || 'Failed to initiate Easebuzz checkout session' });
    }

    return res.status(200).json({
      access_key: result.data,
      txnid,
      key: KEY,
      env: ENV,
      isMock: false,
    });
  } catch (err) {
    console.error('Easebuzz create-order exception:', err);
    return res.status(500).json({ error: 'Internal server error while creating payment order.' });
  }
}

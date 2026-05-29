// api/easebuzz-create-order.js — Vercel Serverless Function
// Securely initiates a payment with Easebuzz and returns the access_key
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Retrieve credentials from environment variables (with fallbacks for test sandboxing)
  const KEY = process.env.EASEBUZZ_KEY || '2P17ZFT5KG'; // standard Easebuzz sandbox key
  const SALT = process.env.EASEBUZZ_SALT || 'DAH88Y353Q'; // standard Easebuzz sandbox salt
  const ENV = process.env.EASEBUZZ_ENV || 'test'; // 'test' or 'prod'

  const { amount = '499.00', email, firstname, phone, userId } = req.body || {};

  if (!email || !firstname || !phone || !userId) {
    return res.status(400).json({ error: 'Missing required parameters: email, firstname, phone, and userId are required.' });
  }

  // Create a unique transaction ID
  const txnid = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const productinfo = 'Tarmac Pro';

  // Ensure amount is formatted as a decimal string (e.g. 499.00)
  const formattedAmount = parseFloat(amount).toFixed(2);

  // Setup callbacks (redirects are required by Easebuzz even in iframe flow)
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const surl = `${protocol}://${host}/api/easebuzz-verify-payment`;
  const furl = `${protocol}://${host}/pricing`;

  // Concatenation order: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
  // Store userId in udf1 so it is returned in the payment callback
  const hashString = `${KEY}|${txnid}|${formattedAmount}|${productinfo}|${firstname}|${email}|${userId}||||||||||${SALT}`;
  
  // Calculate SHA-512 hash
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

    // Return access key, txnid and key to client
    return res.status(200).json({
      access_key: result.data,
      txnid,
      key: KEY,
      env: ENV,
    });
  } catch (err) {
    console.error('Easebuzz create-order exception:', err);
    return res.status(500).json({ error: 'Internal server error while creating payment order.' });
  }
}

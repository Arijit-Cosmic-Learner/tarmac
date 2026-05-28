// api/create-order.js — Vercel Serverless Function
// Securely creates a Razorpay order using server-side credentials

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay credentials not configured' });
  }

  const { amount = 49900, currency = 'INR', userId = 'anonymous' } = req.body || {};

  // Build Basic Auth header
  const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,       // in paise (49900 = ₹499)
        currency,
        receipt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Razorpay order creation failed:', data);
      return res.status(response.status).json({ error: data.error?.description || 'Failed to create order' });
    }

    // Return only what the frontend needs
    return res.status(200).json({
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

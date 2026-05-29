// api/razorpay-fetch-payments.js — Vercel Serverless Function
// Fetches the latest payments directly from Razorpay for the Admin Dashboard.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay credentials not configured' });
  }

  try {
    const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    
    // Fetch last 50 payments
    const response = await fetch(`https://api.razorpay.com/v1/payments?count=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Razorpay fetch payments failed: ${data.error?.description}`);
      return res.status(response.status).json({ error: data.error?.description || 'Failed to fetch payments' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching Razorpay payments:', err);
    return res.status(500).json({ error: 'Internal server error fetching payments' });
  }
}

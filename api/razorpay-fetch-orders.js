// api/razorpay-fetch-orders.js — Vercel Serverless Function
// Fetches the latest orders directly from Razorpay for the Admin Dashboard.

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
    
    // Fetch last 50 orders, expand payments
    const response = await fetch(`https://api.razorpay.com/v1/orders?count=50&expand[]=payments`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Razorpay fetch orders failed: ${data.error?.description}`);
      return res.status(response.status).json({ error: data.error?.description || 'Failed to fetch orders' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching Razorpay orders:', err);
    return res.status(500).json({ error: 'Internal server error fetching orders' });
  }
}

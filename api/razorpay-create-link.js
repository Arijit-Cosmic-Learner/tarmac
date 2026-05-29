// api/razorpay-create-link.js — Vercel Serverless Function
// Creates a manual Razorpay Payment Link for a specific candidate.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay credentials not configured' });
  }

  const { userId, name, email, phone, amount = 49900 } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    
    // Payment links expire in 3 days (3 * 24 * 60 * 60 = 259200 seconds)
    const expireBy = Math.floor(Date.now() / 1000) + 259200; 

    const payload = {
      amount, // default 499 INR in paise
      currency: "INR",
      accept_partial: false,
      expire_by: expireBy,
      reference_id: `link_${userId.substring(0, 10)}_${Date.now().toString().slice(-6)}`,
      description: "Tarmac Pro - Interview Prep Upgrade",
      customer: {
        name: name || "Tarmac Candidate",
        contact: phone || "",
        email: email || ""
      },
      notify: {
        sms: !!phone,
        email: !!email
      },
      reminder_enable: true,
      notes: {
        userId: userId,
        purpose: "manual_upgrade"
      }
    };

    const response = await fetch(`https://api.razorpay.com/v1/payment_links/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Razorpay payment link creation failed: ${data.error?.description}`);
      return res.status(response.status).json({ error: data.error?.description || 'Failed to create payment link' });
    }

    // Return the generated link details
    return res.status(200).json({
      success: true,
      id: data.id,
      short_url: data.short_url,
      status: data.status,
      expire_by: data.expire_by
    });
  } catch (err) {
    console.error('Error creating Razorpay payment link:', err);
    return res.status(500).json({ error: 'Internal server error creating link' });
  }
}

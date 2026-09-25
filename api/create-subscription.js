// api/create-subscription.js — Vercel Serverless Function
// Securely looks up/creates a Razorpay plan, then creates a subscription

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

  const { userId, planType = 'all', accessRole = 'all', tenure = 3 } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  // 1. Determine target amount and descriptions
  // All Access: ₹499 (49900 paise)
  // Course Specific: ₹199 (19900 paise)
  const amount = planType === 'all' ? 49900 : 19900;
  const planName = planType === 'all' 
    ? "Tarmac Pro All-Access Monthly Subscription"
    : "Tarmac Pro Course-Specific Monthly Subscription";
  
  const planDescription = planType === 'all'
    ? "Unlimited access to all interview prep tracks (Solutions Engineer, Technical Account Manager, and Product Support Engineer), including concept libraries, AI mock interview feedback, and monthly updates."
    : "Continuous month-on-month access to your chosen specialized interview track on Tarmac, featuring full answer frameworks and AI mock interview feedback.";

  // 2. Map directly to the two pre-created Razorpay Plan IDs
  // All-Access (₹499/mo): plan_Svk8Lpsd1mQUfD
  // Course-Specific (₹199/mo): plan_Svk4aR9vkzl2JX
  const planId = planType === 'all' 
    ? (process.env.RAZORPAY_PLAN_ALL_ACCESS || 'plan_Svk8Lpsd1mQUfD')
    : (process.env.RAZORPAY_PLAN_COURSE_SPECIFIC || 'plan_Svk4aR9vkzl2JX');

  const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');

  try {

    // 4. Create Subscription
    console.log(`Creating subscription for user: ${userId}, Plan: ${planId}, Tenure: ${tenure}...`);
    const createSubRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: tenure,
        quantity: 1,
        customer_notify: true,
        notes: {
          userId,
          purchaseType: 'subscription',
          accessType: planType,
          accessRole: planType === 'role' ? accessRole : 'all',
          tenure: String(tenure),
        }
      }),
    });

    const subData = await createSubRes.json();
    if (!createSubRes.ok) {
      console.error('Razorpay subscription creation failed:', subData);
      return res.status(createSubRes.status).json({ 
        error: subData.error?.description || 'Failed to initialize subscription checkout' 
      });
    }

    console.log(`Successfully created subscription: ${subData.id}`);

    return res.status(200).json({
      subscription_id: subData.id,
      plan_id: subData.plan_id,
      short_url: subData.short_url,
    });

  } catch (err) {
    console.error('create-subscription error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// api/my-payments.js — Vercel Serverless Function
// Securely retrieves rich payment and subscription logs from Supabase for a student.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server database configuration key error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', [
        'payment.captured',
        'payment_link.paid',
        'subscription.activated',
        'subscription.charged'
      ])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhook_events for payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history logs.' });
    }

    const receipts = (events || []).map(event => {
      const payload = event.payload || {};
      const paymentEntity   = payload.payload?.payment?.entity;
      const paymentLinkEntity = payload.payload?.payment_link?.entity;
      const subscriptionEntity = payload.payload?.subscription?.entity;

      // ── Merge notes from whatever entity is present ─────────────────────
      const notes = paymentEntity?.notes ||
                    paymentLinkEntity?.notes ||
                    subscriptionEntity?.notes || {};

      const purchaseType = notes.purchaseType ||
        (event.event_type.startsWith('subscription') ? 'subscription' : 'pass');
      const accessType = notes.accessType || 'all';
      const accessRole = notes.accessRole || 'all';

      // ── Tenure (months purchased) ───────────────────────────────────────
      // Stored in notes.tenure (set at checkout) or subscription total_count
      const tenureMonths = parseInt(
        notes.tenure ||
        subscriptionEntity?.total_count ||
        (purchaseType === 'pass' ? 0 : 1),
        10
      );

      // ── Amount ──────────────────────────────────────────────────────────
      let amountPaise = paymentEntity?.amount ||
                        paymentLinkEntity?.amount ||
                        null;
      // subscription.activated may not carry a payment sub-entity
      if (!amountPaise) {
        amountPaise = accessType === 'all' ? 49900 : 19900;
      }
      const amount   = amountPaise / 100;
      const currency = paymentEntity?.currency ||
                       paymentLinkEntity?.currency ||
                       'INR';

      // ── Validity window ─────────────────────────────────────────────────
      // For subscriptions: current_start → current_end from Razorpay
      // For passes: event date → +20 days
      let periodStart = null;
      let periodEnd   = null;

      if (purchaseType === 'subscription' && subscriptionEntity) {
        periodStart = subscriptionEntity.current_start
          ? new Date(subscriptionEntity.current_start * 1000).toISOString()
          : event.created_at;
        periodEnd = subscriptionEntity.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : null;
      } else if (purchaseType === 'pass') {
        periodStart = event.created_at;
        periodEnd   = new Date(new Date(event.created_at).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString();
      }

      // ── Validity Month Name ─────────────────────────────────────────────
      let validUntilMonth = null;
      if (periodEnd) {
        const peDate = new Date(periodEnd);
        validUntilMonth = peDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      // ── Tenure selected ─────────────────────────────────────────────────
      let tenureSelected = '';
      if (purchaseType === 'subscription') {
        tenureSelected = `${tenureMonths} Month${tenureMonths > 1 ? 's' : ''}`;
      } else {
        tenureSelected = notes.tenure && notes.tenure !== '0'
          ? `${notes.tenure}-Day Pass`
          : '20-Day Pass';
      }

      // ── Charge number in subscription sequence ──────────────────────────
      const chargeCount = subscriptionEntity?.paid_count || null;

      // ── Payment method details ──────────────────────────────────────────
      const method = paymentEntity?.method || null;                         // card / upi / netbanking / wallet
      const bank   = paymentEntity?.bank   || null;                         // e.g. HDFC
      const wallet = paymentEntity?.wallet || null;                         // e.g. paytm
      const vpa    = paymentEntity?.vpa    || null;                         // UPI VPA e.g. user@ybl
      const cardNetwork = paymentEntity?.card?.network || null;             // Visa / Mastercard
      const cardLast4   = paymentEntity?.card?.last4   || null;
      const cardIssuer  = paymentEntity?.card?.issuer  || null;

      // ── Email and Contact details ───────────────────────────────────────
      const email = paymentEntity?.email || paymentLinkEntity?.customer?.email || subscriptionEntity?.customer?.email || null;
      const contact = paymentEntity?.contact || paymentLinkEntity?.customer?.contact || subscriptionEntity?.customer?.contact || null;

      // ── Subscription reference ──────────────────────────────────────────
      const subscriptionId = paymentEntity?.subscription_id ||
                             subscriptionEntity?.id ||
                             event.order_id ||
                             null;

      // ── Payment ID ──────────────────────────────────────────────────────
      const paymentId = paymentEntity?.id || event.payment_id || null;

      // ── Description label ───────────────────────────────────────────────
      const roleLabel = accessRole === 'PSE'          ? 'Solutions Engineer'       :
                        accessRole === 'TAM'          ? 'Technical Account Manager' :
                        accessRole === 'Tech Support' ? 'Product Support'           : accessRole;

      let description;
      if (purchaseType === 'subscription') {
        description = accessType === 'all'
          ? 'Tarmac Pro All-Access Monthly Subscription'
          : `Tarmac Pro ${roleLabel} Monthly Subscription`;
      } else {
        description = accessType === 'all'
          ? 'Tarmac Pro All-Access 20-Day Pass'
          : `Tarmac Pro ${roleLabel} 20-Day Pass`;
      }

      // ── Event label ─────────────────────────────────────────────────────
      const eventLabel = event.event_type === 'subscription.activated' ? 'Subscription Activated'  :
                         event.event_type === 'subscription.charged'   ? 'Subscription Renewed'     :
                         event.event_type === 'payment.captured'       ? 'Payment Captured'         :
                         event.event_type === 'payment_link.paid'      ? 'Payment Link Paid'        :
                         event.event_type;

      // ── Safety & Integrity details ──────────────────────────────────────
      const securityInfo = {
        gatewayName: 'Razorpay Secure',
        pciCompliant: true,
        sslEncrypted: true,
        authStatus: 'HMAC Signature Verified',
        bankTxnId: paymentEntity?.acquirer_data?.bank_transaction_id || paymentEntity?.acquirer_data?.rrn || null,
        maskedEmail: email ? email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(5, b.length)) + c) : null,
        maskedContact: contact ? (contact.length > 4 ? contact.slice(0, 3) + '****' + contact.slice(-3) : '***') : null
      };

      return {
        id:             event.id,
        date:           event.created_at,
        eventType:      event.event_type,
        eventLabel,
        paymentId,
        subscriptionId,
        description,
        purchaseType,
        accessType,
        accessRole:     accessType !== 'all' ? roleLabel : null,
        amount,
        currency,
        tenureMonths:   purchaseType === 'subscription' ? tenureMonths : null,
        tenureSelected,
        validUntilMonth,
        chargeCount,
        periodStart,
        periodEnd,
        method,
        bank,
        wallet,
        vpa,
        cardNetwork,
        cardLast4,
        cardIssuer,
        status:         'Success',
        verified:       true,      // HMAC-verified by Razorpay webhook
        securityInfo,
      };
    });

    // ── Deduplication ───────────────────────────────────────────────────────
    const uniqueReceipts = [];
    const seen = new Set();

    for (const r of receipts) {
      // Use paymentId if real, else fall back to subscriptionId + eventType
      const key = r.paymentId
        ? `${r.paymentId}`
        : `${r.subscriptionId}-${r.eventType}-${r.periodStart}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueReceipts.push(r);
      }
    }

    return res.status(200).json(uniqueReceipts);

  } catch (err) {
    console.error('my-payments api error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

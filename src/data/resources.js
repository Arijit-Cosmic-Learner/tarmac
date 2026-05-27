// Tarmac — Resource Library
// 8 concept explainers for non-CS engineering grads
// Written at "need to know for interview" depth — not engineering depth

export const resources = [
  {
    id: 'rest-apis',
    title: 'REST APIs',
    icon: '🔌',
    read_time: '4 min',
    free: true,
    why_you_need_this:
      'Every SE/TAM/Pre-Sales interview at a tech company will involve APIs. If you can\'t explain what an API call does, you\'ll lose credibility in Round 1. This is the most important concept on this list.',
    sections: [
      {
        heading: 'What is an API in plain English?',
        content:
          'API = Application Programming Interface. It\'s a contract between two systems: "if you send me data in this format, I\'ll send you back data in that format." Think of it as a very formal conversation between two apps. Your app sends a message (request), the other app replies (response). The "interface" part just means the format they agreed on.',
      },
      {
        heading: 'What is REST?',
        content:
          'REST is a style of building APIs. It uses the same rules your browser uses when you visit a website — HTTP. REST APIs use four main verbs: GET (fetch data), POST (send/create new data), PUT (update existing data), DELETE (remove data). Most of what you\'ll work with as an SE is GET and POST.',
      },
      {
        heading: 'A real example: calling a payment API',
        content:
          'When a merchant\'s website calls Razorpay to create a payment order, they\'re doing a POST request. They send the amount, currency, and receipt ID. Razorpay\'s server creates the order and sends back an order_id. The merchant\'s frontend uses that order_id to show the payment modal. That entire exchange is one REST API call.',
      },
      {
        heading: 'What are API keys?',
        content:
          'An API key is a password for your application. Instead of entering a username/password every time, your app includes the API key in every request. The API key tells the server: "I\'m a valid merchant, and here are my credentials." There are usually two keys: test key (safe to experiment) and live key (handles real money — treat like a bank password).',
      },
      {
        heading: 'What is a status code?',
        content:
          '200 = OK (success). 201 = Created. 400 = Bad Request (something wrong with your input). 401 = Unauthorized (wrong API key). 404 = Not Found. 500 = Server Error (their problem, not yours). As an SE, knowing these lets you instantly identify whose fault a failure is when debugging.',
      },
    ],
    key_takeaway:
      'An API is a formal agreement between two systems on how to talk. REST is the most common style. You send a request (verb + endpoint + data), you get a response (status code + data). API keys are the authentication layer.',
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: '🔔',
    read_time: '3 min',
    free: true,
    why_you_need_this:
      'Webhooks come up in 80% of SE/TAM interviews at payment or SaaS companies. "What is a webhook?" is almost always asked. But more importantly, "what happens when a webhook fails?" is the follow-up that separates prepared candidates from the rest.',
    sections: [
      {
        heading: 'The polling problem',
        content:
          'Imagine you\'re waiting for a package. Option A: you stand at the door and check every 5 minutes. Option B: the delivery person rings the bell when they arrive. Polling is Option A. Webhooks are Option B. Polling is wasteful — you\'re making API calls constantly even when nothing has happened.',
      },
      {
        heading: 'How a webhook works',
        content:
          'A webhook is a notification from one system to another when something happens. When a payment succeeds, Razorpay sends a POST request to your server\'s URL (the "webhook URL"). Your server receives it, processes it, and sends back a 200 OK. The key difference from a regular API call: Razorpay is the caller here, not the merchant.',
      },
      {
        heading: 'What gets sent in a webhook?',
        content:
          'A webhook payload is a JSON object describing the event. For a payment success: payment_id, order_id, amount, status, timestamp. Your server reads this and updates the order status in your database. Without webhooks, you\'d never know when a payment succeeded unless you kept polling.',
      },
      {
        heading: 'What happens when a webhook fails?',
        content:
          'This is the follow-up question every SE must answer. If your server returns anything other than 200 OK (like a 500 error or a timeout), Razorpay will retry the webhook. Usually with exponential backoff: after 1 min, then 5 min, then 30 min, etc. If all retries fail, the event is dropped. This is why merchants should also have a reconciliation job that double-checks payments independently.',
      },
      {
        heading: 'How to secure a webhook',
        content:
          'Anyone could send a fake POST request to your webhook URL. To prevent this, payment companies sign webhook payloads with a secret key and include the signature in the request header. Your server verifies the signature before processing. If the signature doesn\'t match, ignore the request — it\'s either a replay attack or someone trying to fake a successful payment.',
      },
    ],
    key_takeaway:
      'Webhooks are event-driven notifications. The platform calls your server when something happens. Always return 200 OK. Verify the signature. Have a reconciliation job as backup. Know the retry/backoff behavior.',
  },
  {
    id: 'authentication',
    title: 'Authentication & OAuth',
    icon: '🔐',
    read_time: '5 min',
    free: true,
    why_you_need_this:
      'Almost every enterprise customer will ask: "Is your platform secure? How does authentication work?" And when you\'re integrating two systems (CRM + ERP, Freshdesk + Salesforce), OAuth is how that connection gets authorized. You need to explain this without making it sound complicated.',
    sections: [
      {
        heading: 'Authentication vs Authorization',
        content:
          'Authentication = "Who are you?" (proving identity). Authorization = "What can you do?" (proving permissions). You authenticate once with your login. You\'re authorized differently based on your role — a support agent and an admin log in the same way but have different permissions. AuthN vs AuthZ. Memorize this distinction.',
      },
      {
        heading: 'API Keys — the simple approach',
        content:
          'The simplest authentication for machine-to-machine: API keys. An API key is a long random string that acts as a password for your application. You include it in the request header: Authorization: Bearer sk_live_xxxx. The downside: if it\'s leaked, the attacker has full access until you revoke it. API keys are great for server-to-server calls where the key is stored securely.',
      },
      {
        heading: 'OAuth 2.0 — the smart approach',
        content:
          '"Sign in with Google" is OAuth. OAuth lets a user authorize your application to access their data on another service — without ever giving you their password. The user logs into Google themselves, Google gives your app a temporary access token, and your app uses that token to make API calls on their behalf. Tokens expire. Tokens can be revoked. This is far safer than sharing passwords.',
      },
      {
        heading: 'The OAuth flow in 4 steps',
        content:
          '1) Your app redirects the user to Google/Salesforce/etc login page. 2) User logs in and grants permission ("Allow this app to access your Gmail contacts"). 3) The authorization server sends your app an authorization code. 4) Your app exchanges that code for an access token + refresh token. After step 4, you use the access token for API calls. When it expires, you use the refresh token to get a new one — without making the user log in again.',
      },
      {
        heading: 'Why refresh tokens matter',
        content:
          'Access tokens expire quickly (usually 1 hour). Refresh tokens last longer (days/months). When an access token expires, your app silently gets a new one using the refresh token. This is why you stay "logged in" to apps even after weeks — the app is refreshing tokens behind the scenes. If a user revokes access, the refresh token is invalidated and they\'ll need to re-authorize.',
      },
    ],
    key_takeaway:
      'API Keys = simple but all-or-nothing. OAuth = secure, scoped, user-controlled. Know the 4-step OAuth flow. Know that access tokens expire (short-lived) and refresh tokens extend the session. AuthN ≠ AuthZ.',
  },
  {
    id: 'payment-flows',
    title: 'Payment Flows in India',
    icon: '💳',
    read_time: '5 min',
    free: false,
    why_you_need_this:
      'If you\'re interviewing at Razorpay, Juspay, PhonePe, Cashfree, Setu, or any fintech company — understanding Indian payment rails is not optional. Every SE interview at these companies will include at least one payment flow question.',
    sections: [
      {
        heading: 'The cast of characters',
        content:
          'Every payment involves: (1) the Customer\'s bank (Issuing Bank — issued the card/UPI linked account), (2) the Merchant\'s bank (Acquiring Bank — holds the merchant\'s settlement account), (3) the Card Network or NPCI (the routing layer — Visa, Mastercard, or NPCI for UPI/RuPay), (4) the Payment Gateway (Razorpay, Cashfree — the middleware that connects everything). Know all four.',
      },
      {
        heading: 'UPI — how it actually works',
        content:
          'UPI is built on IMPS (Immediate Payment Service) rails with a virtual address layer on top. A UPI transaction: Customer scans QR or enters UPI ID → their UPI app sends a payment request to NPCI → NPCI routes to the customer\'s bank → bank deducts the amount and sends confirmation → NPCI routes success to the merchant\'s bank → merchant\'s bank credits the merchant. End-to-end: 3-5 seconds. Free. 24x7.',
      },
      {
        heading: 'Card payments — authorization vs settlement',
        content:
          'When you pay by card at checkout: the gateway sends an authorization request to the customer\'s bank. The bank "freezes" the amount (holds it) and sends back an authorization code. The merchant has 24-48 hours to "capture" this — actually claim the held amount. This is when the money moves. Settlement (when the merchant actually sees it in their account) takes T+1 or T+2 more days depending on the gateway and the merchant\'s bank.',
      },
      {
        heading: 'Why do payments fail?',
        content:
          'The most common reasons: (1) Insufficient funds (customer\'s bank declines). (2) 3D Secure verification not completed (customer didn\'t enter OTP). (3) Card blocked or expired. (4) Transaction limit exceeded (UPI has a ₹1L limit per transaction for most banks). (5) Bank server downtime (the issuing bank is temporarily unreachable). (6) Technical timeout (the authorization request took too long). Each failure type needs a different customer communication.',
      },
      {
        heading: 'Refunds and chargebacks — critical difference',
        content:
          'Refund = the merchant voluntarily returns money (through the gateway). Takes 5-7 working days for the money to reach the customer. Chargeback = the customer disputes the transaction directly with their bank. The bank reclaims the money from the merchant without the merchant\'s consent. The merchant can dispute the chargeback with evidence. Chargebacks have a fee and too many can get a merchant blacklisted. SEs often help merchants build refund flows and understand chargeback documentation.',
      },
    ],
    key_takeaway:
      'Know the 4 parties (issuing bank, acquiring bank, network, gateway). Know UPI is NPCI-routed and instant. Know card authorization is not the same as settlement. Know the top failure reasons. Know refund ≠ chargeback.',
  },
  {
    id: 'slas',
    title: 'SLAs & Uptime',
    icon: '📊',
    read_time: '3 min',
    free: false,
    why_you_need_this:
      'Every enterprise customer will ask about your SLA. As an SE or TAM, you need to explain uptime commitments, understand what "the nines" mean, and know how to respond when an SLA is breached. This is essential for roles at Freshworks, Zoho, Salesforce, and BrowserStack.',
    sections: [
      {
        heading: 'What is an SLA?',
        content:
          'SLA = Service Level Agreement. A formal written commitment about the quality and availability of a service. Common SLA metrics: Uptime (% time the service is operational), Response Time (how quickly support responds to a ticket), Resolution Time (how quickly an issue gets fixed). SLAs are usually in the contract and breaching them can trigger financial penalties.',
      },
      {
        heading: 'The Nines — memorize this table',
        content:
          '99% uptime = 3.65 days of downtime per year. 99.9% ("three nines") = 8.7 hours per year. 99.95% = 4.4 hours per year. 99.99% ("four nines") = 52 minutes per year. 99.999% ("five nines") = 5.3 minutes per year. Most SaaS products promise 99.9% or 99.95%. Banking systems often require 99.99%. Know this cold — you will be asked.',
      },
      {
        heading: 'Planned vs. unplanned downtime',
        content:
          'SLA uptime calculations usually exclude planned maintenance windows (scheduled upgrades, deployments). Unplanned downtime (an outage, a bug that takes the service down) is what counts against your SLA. Good engineering teams communicate maintenance windows in advance and schedule them during off-peak hours.',
      },
      {
        heading: 'Ticket priority levels (P1-P4)',
        content:
          'P1 = Critical: revenue-impacting, service completely down. Response SLA: usually 15-30 minutes. P2 = High: significant functionality broken but workaround exists. Response SLA: 2-4 hours. P3 = Medium: non-critical issue or partial functionality impact. Response SLA: 1 business day. P4 = Low: cosmetic or informational. Response SLA: 3-5 business days. As an SE, you triage incoming issues and assign priority before routing.',
      },
      {
        heading: 'SLA breach — what happens next',
        content:
          'Most contracts include SLA credits: if uptime falls below the committed level, the customer gets a credit on their next invoice. As an SE, your role in an SLA breach: provide the Root Cause Analysis (RCA) document, explain what failed and why, what was fixed, and what was implemented to prevent recurrence. The commercial discussion (credits) is handled by the account manager — but you provide the technical narrative.',
      },
    ],
    key_takeaway:
      'Know the nines by heart. Know the P1-P4 priority system. Know that SLA breach = RCA document + credits discussion. Know that planned maintenance is excluded from SLA calculations.',
  },
  {
    id: 'sql-basics',
    title: 'SQL Basics',
    icon: '🗄️',
    read_time: '5 min',
    free: false,
    why_you_need_this:
      'Many SE/TAM roles will ask you to write or read simple SQL queries to answer customer data questions. "Show me all transactions that failed yesterday" — if you can answer this with a simple SELECT statement, you become significantly more capable than peers who can\'t. No coding required — just the concepts.',
    sections: [
      {
        heading: 'What is SQL and why do you need it?',
        content:
          'SQL = Structured Query Language. It\'s the language used to talk to databases. Every application stores its data somewhere — user records, transactions, orders, tickets. SQL lets you read, filter, sort, and aggregate that data. As an SE, you\'ll use SQL to answer customer questions quickly without waiting for an engineer to pull data for you.',
      },
      {
        heading: 'SELECT, WHERE, ORDER BY',
        content:
          'SELECT = choose which columns to show. FROM = which table. WHERE = filter rows. ORDER BY = sort results. Example: "Show me all failed transactions from yesterday" → SELECT payment_id, amount, status, created_at FROM transactions WHERE status = \'failed\' AND created_at >= \'2024-01-15\' ORDER BY created_at DESC. Read this like English: "Give me payment_id, amount, status, created_at from transactions where status is failed and created_at is yesterday, newest first."',
      },
      {
        heading: 'GROUP BY and COUNT',
        content:
          '"How many transactions failed per bank yesterday?" → SELECT bank_name, COUNT(*) as failure_count FROM transactions WHERE status = \'failed\' GROUP BY bank_name ORDER BY failure_count DESC. GROUP BY bundles rows that have the same value in a column. COUNT(*) counts how many rows are in each group. This gives you: HDFC Bank - 234 failures, ICICI Bank - 89 failures, etc. Powerful for pattern detection.',
      },
      {
        heading: 'JOINs — connecting two tables',
        content:
          '"Show me customer name and their failed transactions" — you need to join the customers table (has customer name) with the transactions table (has payment data). They share customer_id. SELECT c.name, t.payment_id, t.amount FROM customers c JOIN transactions t ON c.customer_id = t.customer_id WHERE t.status = \'failed\'. INNER JOIN = only rows that exist in both tables. LEFT JOIN = all rows from the left table, even if no match in the right table.',
      },
      {
        heading: 'Practical SE use cases for SQL',
        content:
          '1) A merchant asks: "How many of my transactions failed due to insufficient funds last month?" → filter by error_code. 2) You need to verify a reported settlement: "Did the refund for order ORD_12345 process?" → SELECT * FROM refunds WHERE order_id = \'ORD_12345\'. 3) QBR prep: "What\'s the monthly transaction volume trend for this account?" → GROUP BY MONTH. You don\'t need to write perfect SQL — knowing the concepts lets you collaborate with engineering to get answers.',
      },
    ],
    key_takeaway:
      'SELECT + FROM + WHERE = the core. GROUP BY + COUNT = aggregations. JOIN = connecting two tables by a shared key. INNER JOIN = only matching rows. LEFT JOIN = all from left table. You don\'t need to be a database engineer — just know enough to ask the right questions.',
  },
  {
    id: 'postman',
    title: 'Postman Basics',
    icon: '🚀',
    read_time: '4 min',
    free: false,
    why_you_need_this:
      'Postman is the #1 tool for testing APIs without writing any code. Every SE who works with integrations uses it daily. If you can open Postman and make an API call to a payment gateway or a CRM, you can debug merchant issues in real-time without waiting for engineering. This is a superpower.',
    sections: [
      {
        heading: 'What is Postman?',
        content:
          'Postman is a desktop/web application that lets you make API calls visually — without writing code. You select the method (GET, POST, etc.), type in the URL, add headers and body, and hit Send. You see the request and response in full. It\'s essentially a browser specifically built for testing APIs. And it\'s free.',
      },
      {
        heading: 'Making your first API call',
        content:
          'Step 1: Download Postman (free at postman.com). Step 2: Create a new Request. Step 3: Select POST, enter the URL: https://api.razorpay.com/v1/orders. Step 4: Go to Authorization, select Basic Auth, enter your API key (username) and secret (password). Step 5: Go to Body, select raw, JSON, and enter: {"amount": 50000, "currency": "INR", "receipt": "receipt_001"}. Step 6: Hit Send. You\'ll get back an order object. You just made a live API call.',
      },
      {
        heading: 'Reading the response',
        content:
          'Postman shows you: Status code (200? 400? 500?), Response body (the JSON data the API returned), Response time (how fast the server responded), Response headers. When debugging a merchant issue, the status code and response body tell you immediately what went wrong. 400 = they sent bad data. 401 = wrong API key. 500 = something broke on the server side.',
      },
      {
        heading: 'Collections and environments',
        content:
          'As an SE, you\'ll build Postman Collections — organized folders of API calls for different workflows. "Create Order → Initiate Payment → Verify Payment → Trigger Refund" is a collection. Environments let you switch between test and live API keys without changing every request. Set up: TEST environment (test API key, test amounts) and PROD environment (live key — use carefully). Never run PROD calls in test mode and vice versa.',
      },
      {
        heading: 'Sharing with merchants',
        content:
          'One of the best SE moves: build a Postman collection for the merchant you\'re onboarding, pre-fill their test credentials, and share the collection with them. Now they can test API calls without any code setup. This dramatically reduces onboarding time and ticket volume. Every major payment company (Razorpay, Stripe, Cashfree) publishes official Postman collections — know how to find and use them.',
      },
    ],
    key_takeaway:
      'Postman = visual API testing tool. Make API calls without code. Read status codes and response bodies to debug. Use Collections for organized workflows. Use Environments to switch between test and live. Share collections with merchants to accelerate onboarding.',
  },
  {
    id: 'integrations',
    title: 'Integration Concepts',
    icon: '🔗',
    read_time: '4 min',
    free: false,
    why_you_need_this:
      'SE, TAM, and Pre-Sales roles often involve helping customers integrate two or more systems: CRM + Payment Gateway, ERP + Helpdesk, etc. Understanding the patterns of integration — not the code — makes you dramatically more effective in technical conversations.',
    sections: [
      {
        heading: 'What is an integration?',
        content:
          'An integration connects two separate software systems so they can share data or trigger actions in each other. Example: when a payment succeeds in Razorpay, it should automatically create an order in the merchant\'s ERP. That connection — Razorpay → ERP — is the integration. Without it, someone would have to manually copy data between systems.',
      },
      {
        heading: 'The three integration patterns',
        content:
          'Pattern 1: API-based (real-time) — System A calls System B\'s API when something happens. Fast, real-time, but both systems need to be online simultaneously. Pattern 2: Webhook-based (event-driven) — System B notifies System A when events occur. More reliable than polling. Pattern 3: File-based (batch) — System A exports a CSV/file at midnight, System B imports it. Old-school but still common in banking/ERP contexts.',
      },
      {
        heading: 'iPaaS and no-code integration tools',
        content:
          'iPaaS = Integration Platform as a Service. Tools like Zapier, Make (formerly Integromat), and Workato let you connect systems visually — no code. "When a payment succeeds in Razorpay → Create row in Google Sheets → Send Slack message." For merchant onboarding, iPaaS tools are often the fastest path to a working integration. As an SE, knowing these tools makes you 10x faster at solving merchant integration problems.',
      },
      {
        heading: 'Common integration failure points',
        content:
          'Most integration failures are one of: (1) Authentication failure — API key expired or wrong environment. (2) Schema mismatch — System A expects "amount" in paise, System B sends it in rupees. (3) Timeout — the downstream system takes too long to respond. (4) Rate limiting — too many API calls too fast. (5) Webhook not received — the URL changed or the server is returning non-200. Knowing these failure patterns lets you diagnose problems 5x faster.',
      },
      {
        heading: 'Integration security basics',
        content:
          'Every integration that handles financial or personal data needs: (1) HTTPS everywhere — no unencrypted data in transit. (2) API key rotation — keys should be changed periodically and immediately if compromised. (3) Webhook signature verification — don\'t trust incoming webhooks without verifying the signature. (4) Data minimization — only transfer the fields you actually need. (5) Audit logging — log who called what and when, so you can trace issues.',
      },
    ],
    key_takeaway:
      'Three patterns: API (real-time), Webhook (event-driven), File (batch). Know iPaaS tools (Zapier, Make). Top 5 failure points: auth, schema mismatch, timeout, rate limit, webhook not received. Security = HTTPS + key rotation + signature verification.',
  },
];

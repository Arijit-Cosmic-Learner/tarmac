// api/send-email.js — Vercel Serverless Function
// Sends retargeting emails via Gmail SMTP using credentials from environment variables.

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, body } = req.body;

  // Validation
  if (!to) {
    return res.status(400).json({ error: 'Recipient email ("to") is required.' });
  }
  if (!subject) {
    return res.status(400).json({ error: 'Email subject is required.' });
  }
  if (!body) {
    return res.status(400).json({ error: 'Email body is required.' });
  }

  // Load credentials from environment
  const GMAIL_USER = process.env.GMAIL_USER || 'admin.tarmac@gmail.com';
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_APP_PASSWORD) {
    console.error('Email sending failed: GMAIL_APP_PASSWORD environment variable is not configured.');
    return res.status(500).json({ error: 'Email sender is not configured on the server.' });
  }

  try {
    // Configure Gmail SMTP transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Tarmac Prep" <${GMAIL_USER}>`,
      to,
      subject,
      text: body,
      // If we want html support in the future: html: body.replace(/\n/g, '<br>')
    };

    console.log(`Sending email from ${GMAIL_USER} to ${to}...`);
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent successfully: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Nodemailer SMTP Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to send email. Please check credentials or SMTP settings.' 
    });
  }
}

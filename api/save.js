import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
import { Resend } from 'resend';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { stories, sessionId } = req.body;
  if (!stories?.length || !sessionId) return res.status(400).json({ error: 'Missing stories or sessionId' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid session' });
  }
  if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not verified' });

  // Idempotency — if already saved for this session, return the existing token
  const existingToken = await redis.get(`saved_${sessionId}`);
  if (existingToken) {
    return res.json({ token: existingToken, email: session.customer_details?.email });
  }

  const email = session.customer_details?.email;
  const token = crypto.randomUUID();
  const appUrl = process.env.APP_URL || 'https://sunnystories.co';
  const magicLink = `${appUrl}/app?token=${token}`;

  // Save stories — 1 year TTL
  await redis.set(`stories_${token}`, { stories, email, createdAt: Date.now() }, { ex: 31536000 });
  // Mark session as saved to prevent duplicate emails
  await redis.set(`saved_${sessionId}`, token, { ex: 31536000 });

  // Send email
  const resend = new Resend(process.env.RESEND_API_KEY);
  const childNames = [...new Set(stories.map(s => s.hero))].join(' & ');
  const previewTitles = stories.slice(0, 3)
    .map(s => `<li style="margin:6px 0;color:#4a6070;">${s.emoji || '✨'} ${s.title}</li>`)
    .join('');

  await resend.emails.send({
    from: 'Sunny Stories <stories@sunnystories.co>',
    to: email,
    subject: `✨ ${childNames}'s Sunny Stories collection is ready`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5fbfd;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(48,108,164,.08);">

    <div style="background:linear-gradient(135deg,#1a4a78,#306ca4,#38a2c2);padding:36px 40px;text-align:center;">
      <div style="font-size:40px;margin-bottom:8px;">☀️</div>
      <div style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:.5px;">Sunny Stories</div>
      <div style="color:rgba(255,255,255,.75);font-size:14px;margin-top:4px;">Personalised stories for Sunshine Coast families</div>
    </div>

    <div style="padding:36px 40px;">
      <h1 style="margin:0 0 12px;font-size:24px;color:#1a2e3a;font-weight:700;">Your stories are ready! 🎉</h1>
      <p style="margin:0 0 20px;color:#4a6070;font-size:16px;line-height:1.6;">
        We've written 10 original stories starring <strong style="color:#306ca4;">${childNames}</strong>,
        set in your favourite Sunshine Coast spots. Click the button below to read them any time.
      </p>

      <div style="background:#f5fbfd;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#38a2c2;letter-spacing:1px;margin-bottom:10px;">A PEEK AT YOUR COLLECTION</div>
        <ul style="margin:0;padding:0 0 0 18px;">
          ${previewTitles}
          <li style="margin:6px 0;color:#4a6070;">…and 7 more stories</li>
        </ul>
      </div>

      <div style="text-align:center;margin-bottom:28px;">
        <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#38a2c2,#306ca4);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:50px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(56,162,194,.3);">
          ✨ Open my stories
        </a>
      </div>

      <p style="margin:0;font-size:13px;color:#4a6070;line-height:1.7;text-align:center;">
        This link opens your full collection instantly — no password needed.<br>
        <strong>Save this email</strong> so you can come back to read them any time.
      </p>
    </div>

    <div style="padding:20px 40px 28px;text-align:center;border-top:1px solid #eef6fa;">
      <p style="margin:0;font-size:12px;color:#4a6070;line-height:1.8;">
        Sunny Stories · Sunshine Coast, QLD<br>
        <a href="https://sunnystories.co" style="color:#38a2c2;text-decoration:none;">sunnystories.co</a>
        &nbsp;·&nbsp;
        <a href="https://www.instagram.com/sunnystoriesco/" style="color:#38a2c2;text-decoration:none;">@sunnystoriesco</a>
      </p>
    </div>

  </div>
</body>
</html>`,
  });

  res.json({ token, email });
}

import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Session ID required' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(id);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  if (session.payment_status !== 'paid') {
    return res.status(402).json({ error: 'Payment not completed' });
  }

  const formData = await redis.get(session.metadata.tempKey);
  if (!formData) {
    return res.status(404).json({ error: 'Session expired — please contact support at stories@sunnystories.co with your receipt.' });
  }

  res.json({ formData, email: session.customer_details?.email });
}

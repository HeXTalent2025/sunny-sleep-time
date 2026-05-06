import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Session ID required' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(id);
  if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not completed' });

  const { storyToken } = session.metadata;
  if (!storyToken) return res.status(400).json({ error: 'Invalid session' });

  const data = await redis.get(`stories_${storyToken}`);
  if (!data) return res.status(404).json({ error: 'Story collection not found' });

  data.bundleUpgrade = true;
  await redis.set(`stories_${storyToken}`, data, { ex: 31536000 });

  return res.status(200).json({ success: true });
}

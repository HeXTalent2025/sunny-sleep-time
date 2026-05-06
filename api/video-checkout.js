import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { storyToken, pendingVideoStories, storyLength, price, childPhotos, childDescriptions } = req.body;

  if (!storyToken || !pendingVideoStories?.length || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.APP_URL || 'https://sunnystories.co';

  // Save video job data temporarily — retrieved after Stripe redirects back
  const videoKey = `video_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await redis.set(videoKey, { storyToken, pendingVideoStories, storyLength, childPhotos: childPhotos || {}, childDescriptions: childDescriptions || {} }, { ex: 7200 });

  const count = pendingVideoStories.length;
  const lengthLabel = storyLength === '5min' ? '5-minute' : '3-minute';
  const storyWord = count === 1 ? 'story' : 'stories';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: `Sunny Stories — ${count} Animated ${storyWord.charAt(0).toUpperCase() + storyWord.slice(1)}`,
          description: `${count} ${lengthLabel} animated ${storyWord} with Australian narration, personalised for your family.`,
        },
        unit_amount: Math.round(price * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    allow_promotion_codes: true,
    metadata: { videoKey },
    success_url: `${appUrl}/app?videosession={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app?token=${storyToken}`,
  });

  res.json({ url: session.url });
}

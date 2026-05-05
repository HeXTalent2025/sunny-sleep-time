import Stripe from 'stripe';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { children, selectedLocations, vibe, storyLength } = req.body;
  if (!children?.length) return res.status(400).json({ error: 'No children provided' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.APP_URL || 'https://sunnystories.co';

  // Save form data temporarily — retrieved after Stripe redirects back
  const tempKey = `form_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await kv.set(tempKey, { children, selectedLocations, vibe, storyLength }, { ex: 7200 });

  const childNames = children.map(c => c.name).filter(Boolean).join(' & ') || 'your child';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: 'Sunny Stories — 10 Personalised Stories',
          description: `A personalised collection starring ${childNames}, set in their favourite Sunshine Coast spots.`,
        },
        unit_amount: 1500,
      },
      quantity: 1,
    }],
    mode: 'payment',
    metadata: { tempKey },
    success_url: `${appUrl}/app?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app`,
  });

  res.json({ url: session.url });
}

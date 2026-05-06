import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { storyToken } = req.body;
  if (!storyToken) return res.status(400).json({ error: 'storyToken required' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.APP_URL || 'https://sunnystories.co';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'aud',
        product_data: {
          name: 'Sunny Stories — Add Australian Narration',
          description: 'Warm Australian voice narration for all 10 of your personalised stories.',
        },
        unit_amount: 1000,
      },
      quantity: 1,
    }],
    mode: 'payment',
    allow_promotion_codes: true,
    metadata: { storyToken },
    success_url: `${appUrl}/app?token=${storyToken}&upgraded=1&nsession={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app?token=${storyToken}`,
  });

  res.json({ url: session.url });
}

import { fal } from '@fal-ai/client';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return res.status(500).json({ error: 'Illustration service not configured' });

  fal.config({ credentials: falKey });

  const { location, locationDesc, pageIndex = 0 } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });

  const locationStr = locationDesc
    ? `${location} on the Sunshine Coast, Queensland — ${locationDesc}`
    : `${location} on the Sunshine Coast, Queensland`;

  const moods = [
    'soft morning light, gentle mist, birds gliding, calm and tranquil',
    'bright midday sunshine, sparkling water, warm golden tones, cheerful and vibrant',
    'late afternoon golden hour, long shadows, magical warm glow, dreamy and serene',
  ];
  const mood = moods[pageIndex % moods.length];

  try {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt: `warm watercolour children's book illustration, ${locationStr}, ${mood}, soft pastel colours, storybook landscape, no people, no text, no characters, gentle brushstrokes, painterly, children's picture book style`,
        image_size: 'landscape_16_9',
        num_inference_steps: 4,
      },
    });

    const imageUrl = result?.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error('Illustration generation failed');

    return res.status(200).json({ imageUrl });
  } catch (e) {
    console.error('Illustration error:', e);
    return res.status(500).json({ error: e?.message || 'Could not generate illustration' });
  }
}

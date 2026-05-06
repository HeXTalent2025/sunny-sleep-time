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

  const { location, interest, vibe } = req.body;
  if (!location) return res.status(400).json({ error: 'location is required' });

  const moodMap = {
    'gentle and sleepy': 'soft dreamy twilight, warm glowing sunset, calm and tranquil',
    'exciting and adventurous': 'bright golden sunlight, dramatic clouds, vibrant and energetic',
    'funny and silly': 'cheerful midday light, colourful and playful, lighthearted',
    'magical and whimsical': 'soft purple-gold light, shimmering sparkles, ethereal and enchanting',
    'curious and educational': 'clear morning light, sharp detail, warm and inviting',
  };
  const mood = moodMap[vibe] || 'warm golden afternoon light, soft and inviting';

  const prompt = `warm watercolour children's book illustration, ${location} on the Sunshine Coast Queensland, ${mood}, inspired by a love of ${interest || 'adventure'}, lush coastal landscape, soft pastel colours, no people, no text, no characters, gentle brushstrokes, painterly, children's picture book style`;

  try {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
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

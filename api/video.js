import { fal } from '@fal-ai/client';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const falKey = process.env.FAL_API_KEY;
  if (!falKey) return res.status(500).json({ error: 'Video service not configured' });

  fal.config({ credentials: falKey });

  const {
    hero,
    location,
    locationDesc,
    pages,
    storyLength,
  } = req.body;

  if (!hero || !pages?.length) {
    return res.status(400).json({ error: 'hero and pages are required' });
  }

  const clipDuration = storyLength === '5min' ? '10' : '5';

  const locationStr = locationDesc
    ? `${location} on the Sunshine Coast, Queensland — ${locationDesc}`
    : `${location} on the Sunshine Coast, Queensland`;

  // Scene moods cycle across the 3 pages
  const sceneMoods = [
    'gentle waves lapping the shore, golden morning light, soft mist, birds gliding overhead',
    'sunlight filtering through trees, a warm breeze, butterflies drifting, flowers swaying',
    'late afternoon golden hour, long shadows, sparkling water, peaceful and magical atmosphere',
  ];

  try {
    const videoUrls = [];

    for (let p = 0; p < pages.length; p++) {
      if (p > 0) await new Promise(r => setTimeout(r, 3000));

      const mood = sceneMoods[p % sceneMoods.length];
      const prompt = `${locationStr}. ${mood}. Cinematic children's book watercolour animation style, gentle fluid movement, soft pastel colours, warm golden light, magical storybook atmosphere, no people, no text.`;

      const result = await fal.subscribe('fal-ai/kling-video/v2.6/pro/text-to-video', {
        input: {
          prompt,
          duration: clipDuration,
          aspect_ratio: '16:9',
        },
      });

      const videoUrl = result?.data?.video?.url;
      if (!videoUrl) throw new Error(`Video generation failed for page ${p + 1}`);
      videoUrls.push(videoUrl);
    }

    return res.status(200).json({ videoUrls });
  } catch (e) {
    console.error('Video generation error:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    const detail = e?.body ?? e?.cause ?? e?.message ?? String(e);
    return res.status(500).json({ error: typeof detail === 'object' ? JSON.stringify(detail) : String(detail) });
  }
}

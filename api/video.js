import { fal } from '@fal-ai/client';

export const config = { maxDuration: 120 };

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
    costar,
    location,
    locationDesc,
    interest,
    pages,
    storyLength,
    childPhotos,
    childDescriptions,
    childAge,
    childInterests,
  } = req.body;

  if (!hero || !pages?.length) {
    return res.status(400).json({ error: 'hero and pages are required' });
  }

  const clipDuration = storyLength === '5min' ? '10' : '5';
  const ageLabel = childAge ? `${childAge}-year-old` : 'young';
  const interestsStr = (childInterests || []).join(', ') || 'exploring and discovering';

  try {
    // ── STEP 1: Resolve character image ───────────────────────────────────

    let characterImageUrl;

    if (childPhotos?.[hero]) {
      const { base64, mimeType } = childPhotos[hero];
      const buf = Buffer.from(base64, 'base64');
      characterImageUrl = await fal.storage.upload(buf, {
        contentType: mimeType,
        filename: `${hero.toLowerCase().replace(/\s+/g, '-')}-photo.jpg`,
      });
    } else {
      const descPrompt = childDescriptions?.[hero]
        ? `smiling ${ageLabel} child, ${childDescriptions[hero]}`
        : `smiling ${ageLabel} child named ${hero} who loves ${interestsStr}`;

      const fluxResult = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt: `warm watercolour children's book illustration, ${descPrompt}, set against a simple soft Sunshine Coast backdrop, full face clearly visible, friendly warm expression, pastel colours, gentle lighting, storybook style, simple background`,
          image_size: 'portrait_4_3',
          num_inference_steps: 4,
        },
      });

      const fluxUrl = fluxResult?.data?.images?.[0]?.url;
      if (!fluxUrl) throw new Error('Character image generation failed');
      // Re-upload to fal storage so the URL doesn't expire across multiple Kling calls
      const imgRes = await fetch(fluxUrl);
      const imgBuf = Buffer.from(await imgRes.arrayBuffer());
      characterImageUrl = await fal.storage.upload(imgBuf, {
        contentType: 'image/jpeg',
        filename: `${hero.toLowerCase().replace(/\s+/g, '-')}-character.jpg`,
      });
    }

    // ── STEP 2: Generate one Kling clip per page (sequential) ─────────────

    const videoUrls = [];
    const locationStr = locationDesc
      ? `${location} on the Sunshine Coast, Queensland — ${locationDesc}`
      : `${location} on the Sunshine Coast, Queensland`;

    for (let p = 0; p < pages.length; p++) {
      const pageText = pages[p];
      const summary = pageText.replace(/\s+/g, ' ').slice(0, 200).trim();

      const klingResult = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
        input: {
          image_url: characterImageUrl,
          prompt: `${locationStr}. ${summary} Warm golden light, children's book animation style, gentle fluid movement, ${hero} exploring and discovering, soft watercolour aesthetic.`,
          duration: clipDuration,
          aspect_ratio: '16:9',
        },
      });

      const videoUrl = klingResult?.data?.video?.url;
      if (!videoUrl) throw new Error(`Video generation failed for page ${p + 1}`);
      videoUrls.push(videoUrl);
    }

    return res.status(200).json({ videoUrls, characterImageUrl });
  } catch (e) {
    console.error('Video generation error:', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}

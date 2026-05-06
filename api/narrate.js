import { Redis } from '@upstash/redis';

export const config = { maxDuration: 60 };

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, storyLength, token, storyIdx } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const cacheKey = (token && storyIdx !== undefined) ? `narration_${token}_${storyIdx}` : null;

  // Check Redis cache first — fail silently so ElevenLabs is always the fallback
  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json({ audioBase64: cached, mimeType: 'audio/mpeg', cached: true });
      }
    } catch (e) {
      console.error('Redis cache read error (non-fatal):', e);
    }
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey  = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    return res.status(500).json({ error: 'Narration service not configured' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.20,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('ElevenLabs error:', response.status, errText);
      return res.status(502).json({ error: 'Narration service unavailable — please try again' });
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // Persist to Redis — fail silently so the audio is always returned even if caching fails
    if (cacheKey) {
      redis.set(cacheKey, audioBase64, { ex: 31536000 }).catch(e =>
        console.error('Redis cache write error (non-fatal):', e)
      );
    }

    return res.status(200).json({ audioBase64, mimeType: 'audio/mpeg' });
  } catch (e) {
    console.error('Narration error:', e);
    return res.status(500).json({ error: 'Could not generate narration — please try again' });
  }
}

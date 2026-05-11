import { Redis } from '@upstash/redis';

export const config = { maxDuration: 120 };

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

// ── Text chunking ────────────────────────────────────────────────────────────
// ElevenLabs degrades in volume on long inputs (500+ words). Splitting into
// ~200-word chunks and concatenating the MP3 buffers keeps energy consistent
// throughout. Chunks run in parallel so latency is roughly the same.
function splitIntoChunks(text, maxWords = 200) {
  const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [para];
      wordCount = words;
    } else {
      current.push(para);
      wordCount += words;
    }
  }
  if (current.length) chunks.push(current.join('\n\n'));
  return chunks.length ? chunks : [text];
}

// ── Single-chunk TTS call ────────────────────────────────────────────────────
async function generateChunk(text, voiceId, apiKey) {
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
          stability: 0.70,          // balanced — maintains energy without monotone fade
          similarity_boost: 0.82,
          style: 0.18,              // moderate expression throughout
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`ElevenLabs ${response.status}: ${err}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

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
        // base64 length × 3/4 ≈ original bytes; 128kbps = 16,000 bytes/sec
        const durationSeconds = Math.round((cached.length * 3 / 4) / 16000);
        return res.status(200).json({ audioBase64: cached, mimeType: 'audio/mpeg', cached: true, durationSeconds });
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
    // Split into chunks and generate sequentially — fixes volume fade on long texts
    // without hitting ElevenLabs' concurrent-request limit (max 3).
    // Sequential adds ~10s per chunk but stays well within the 120s maxDuration.
    const chunks = splitIntoChunks(text);
    const buffers = [];
    for (const chunk of chunks) {
      buffers.push(await generateChunk(chunk, voiceId, apiKey));
    }
    const audioBuffer = Buffer.concat(buffers);
    const audioBase64 = audioBuffer.toString('base64');

    // 128kbps = 16,000 bytes/sec — calculate duration from buffer size
    const durationSeconds = Math.round(audioBuffer.length / 16000);

    // Persist to Redis — fail silently so the audio is always returned even if caching fails
    if (cacheKey) {
      redis.set(cacheKey, audioBase64, { ex: 31536000 }).catch(e =>
        console.error('Redis cache write error (non-fatal):', e)
      );
    }

    return res.status(200).json({ audioBase64, mimeType: 'audio/mpeg', durationSeconds });
  } catch (e) {
    console.error('Narration error:', e);
    return res.status(500).json({ error: 'Could not generate narration — please try again' });
  }
}

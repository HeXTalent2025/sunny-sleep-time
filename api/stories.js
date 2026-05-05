import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const data = await kv.get(`stories_${token}`);
  if (!data) return res.status(404).json({ error: 'Collection not found or link expired' });

  res.json(data);
}

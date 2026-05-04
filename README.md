# Sunny Sleep Time — Vercel Deployment

## Project structure
```
sunnysleep-vercel/
├── index.html        ← The full app
├── vercel.json       ← Vercel config
├── api/
│   └── generate.js  ← Serverless proxy (keeps API key secure)
└── README.md
```

## Deploy in 3 steps

### 1 — Get your Anthropic API key
- Go to **console.anthropic.com** → API Keys → Create Key
- Copy the key (starts with `sk-ant-...`)

### 2 — Deploy to Vercel
Option A (drag & drop — fastest):
- Go to **vercel.com** → Add New Project
- Drag the `sunnysleep-vercel` folder in, or connect your GitHub repo
- Click Deploy

Option B (Vercel CLI):
```bash
npm i -g vercel
cd sunnysleep-vercel
vercel
```

### 3 — Add your API key
- In Vercel dashboard → your project → Settings → Environment Variables
- Name: `ANTHROPIC_API_KEY`
- Value: your `sk-ant-...` key
- Environment: Production (and Preview if you want)
- Click Save → then Deployments → Redeploy

## How it works
- Browser calls `/api/generate` (your Vercel function)
- Function adds the secret API key and calls Anthropic
- Stories return to the browser
- API key is never exposed in frontend code

## Costs
- Vercel free tier: 100GB bandwidth, 100k function invocations/month
- Anthropic API: ~$0.15 per generation (10 stories)
- At $10/sale you're spending ~$0.15 in API costs per customer

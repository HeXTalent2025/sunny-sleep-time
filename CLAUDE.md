# Sunny Stories

Personalised stories for Sunshine Coast families. $15 for 10 stories, delivered instantly.
Not bedtime-only — read anywhere, any time.

## URLs
- Live site: sunnystories.co
- GitHub: github.com/HeXTalent2025/sunny-stories
- Instagram: @sunnystoriesco

## Stack
- Frontend: HTML/CSS/JS (no framework)
- Hosting: Vercel (auto-deploys from push to main)
- AI: Anthropic Claude API (claude-sonnet-4-6) via /api/generate.js
- Payments: Stripe (live mode, checkout sessions, promo codes enabled)
- Storage: Upstash Redis via Vercel integration (KV store)
- Email: Resend (transactional, from stories@sunnystories.co)
- Domain: sunnystories.co

## File Structure
- index.html        → landing page (sunnystories.co)
- app.html          → the app (sunnystories.co/app)
- stories.html      → sample stories page (/stories) — 3 examples: age 3, 5, 7
- legal.html        → privacy policy + terms of service (/legal)
- gift.html         → gift reveal page (/gift?token=T&name=N) — recipient opens this
- give.html         → gift marketing page (/give) — use cases, personas, how gifting works
- api/generate.js   → Anthropic API proxy (SSE streaming, batches of 4 blueprints)
- api/checkout.js   → creates Stripe checkout session, saves form data to Redis
- api/session.js    → verifies payment, retrieves form data from Redis by tempKey
- api/save.js       → saves stories to Redis (1yr TTL), sends magic link email via Resend
- api/stories.js    → fetches stories from Redis by token
- vercel.json       → routing config (explicit routes for all pages + APIs)
- package.json      → stripe, @upstash/redis, resend
- CLAUDE.md         → this file

## Key User Flows

### Standard purchase
1. User fills form (children, ages, locations, vibe, story length) → /api/checkout
2. Form data saved to Redis (2hr TTL, key: form_TIMESTAMP_RANDOM)
3. Stripe checkout → success redirect to /app?session=SESSION_ID
4. handlePaymentReturn() → /api/session → runGeneration() (3 batches of 4 stories via SSE)
5. saveAndEmail() → /api/save → stories saved as stories_{token} (1yr TTL) → Resend email with magic link
6. User sees story list

### Gift flow
- Entry via /app?gift=true (nav, /give page, pricing section)
- giftMode + giftRecipient name persisted to localStorage across Stripe redirect
- After generation: shows gift-ready screen with shareable /gift?token=T&name=N link
- Email also includes gift link button

### Magic link access
- /app?token=TOKEN → fetches stories from /api/stories → story list

### Gift page
- /gift?token=TOKEN&name=Claire → beautiful gift reveal UI → inline story reader

## Brand
- Tagline: "Your child. Their favourite place. Their very own story."
- Fonts: Fraunces (headings/excerpts) + Plus Jakarta Sans (body/UI)
- Ocean Deep:   #306ca4  — headings, footer
- Ocean:        #38a2c2  — buttons, links, labels
- Ocean Bright: #40dbe1  — accents, hover states
- Terracotta:   #d86e59  — badges, accents (use sparingly)
- Pastels:      #ffbbce #d9bbff #bbdeff #daffbb #ffeebb (chips, tags, step indicators)
- Bg Primary:   #ffffff
- Bg Soft:      #f5fbfd
- Bg Section:   #eef6fa
- Text Dark:    #1a2e3a
- Text Soft:    #4a6070

## Voice
- Warm, lyrical, locally proud
- Celebrate the Sunshine Coast first, product second
- Never salesy, never bedtime-only framing
- Story excerpts read like literature, not marketing

## Environment Variables (set in Vercel dashboard — never commit)
- ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY (live mode: sk_live_...)
- KV_REST_API_URL — Upstash Redis (injected by Vercel-Upstash integration)
- KV_REST_API_TOKEN — Upstash Redis (injected by Vercel-Upstash integration)
- RESEND_API_KEY
- APP_URL — https://sunnystories.co

## Critical Notes
- Redis env vars MUST be KV_REST_API_URL and KV_REST_API_TOKEN — not UPSTASH_REDIS_* variants. The Vercel integration injects these specific names. Using the wrong names causes a silent timeout and 500 errors on checkout.
- Story generation is split into batches of 4 blueprints per API call (3 calls for 10 stories) to prevent mobile SSE timeouts.
- Stripe promo codes are enabled (allow_promotion_codes: true in checkout.js).
- All story data stored under stories_{token} key. Magic link = /app?token={token}.

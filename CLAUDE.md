# Sunny Stories

Personalised stories for Sunshine Coast families. $10 for 10 stories, delivered instantly.
Not bedtime-only — read anywhere, any time.

## URLs
- Live site: sunnystories.co
- GitHub: github.com/HeXTalent2025/sunny-stories
- Instagram: @sunnystories

## Stack
- Frontend: HTML/CSS/JS (no framework)
- Hosting: Vercel (auto-deploys from push to main)
- AI: Anthropic Claude API (claude-sonnet-4-6) via /api/generate.js
- Payments: Stripe (not yet integrated — next milestone)
- Domain: sunnystories.co (registered, pointed to Vercel)

## File Structure
- index.html        → landing page (sunnystories.co)
- app.html          → the app (sunnystories.co/app)
- api/generate.js   → Vercel serverless function, proxies Anthropic API
- vercel.json       → routing config
- CLAUDE.md         → this file

## Brand
- Tagline: "Your child. Their favourite place. Their very own story."
- Fonts: Fraunces (headings/excerpts) + Plus Jakarta Sans (body/UI)
- Ocean Deep:   #306ca4  — headings, footer
- Ocean:        #38a2c2  — buttons, links, labels
- Ocean Bright: #40dbe1  — accents, hover states
- Terracotta:   #d86e59  — badges, stars (use sparingly)
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

## Environment Variables (set in Vercel dashboard)
- ANTHROPIC_API_KEY — never commit this to the repo

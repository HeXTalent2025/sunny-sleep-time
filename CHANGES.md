# Sunny Stories — Narration Merge Update

## Files Changed

| File | Change |
|------|--------|
| api/checkout.js | Single SKU at $25 AUD; narration add-on removed; product name updated to "10 Personalised Audio Stories" |
| app.html | bundleUpgrade removed; audio bar always visible; background narration prefetch; download button added; retry logic; read-aloud instruction added to prompt; narration upgrade CTA removed; price updated to $25 |
| index.html | Price updated to $25; hero copy updated; How It Works step 3 updated; narration add-on callout removed; features list updated |
| give.html | Price updated to $25; copy updated to audio-first framing; narration listed as included |
| gift.html | bundleUpgrade hardcoded true; audio bar always shows; cover copy updated |
| api/save.js | bundleUpgrade always saved as true |
| CHANGES.md | This file |

## Confirmations
- ✅ Stripe amount is now **2500 AUD cents ($25.00)** — single SKU, no add-ons
- ✅ Narration add-on UI fully removed from app.html, index.html, give.html
- ✅ Audio bar visible for all users with no paywall or conditional logic
- ✅ Background prefetch starts when a story is opened
- ✅ Download button added to audio bar (blob URL, iOS Safari compatible)
- ✅ Retry logic: first fail shows "tap to retry", second fail shows "unavailable for this story"

## Needs Manual Review
- OG meta tags in index.html still say "personalised stories" — consider updating og:description
- Email templates (Resend) in api/save.js — subject line may still say "Your Sunny Stories are ready" — consider updating to "Your audio stories are ready"
- Stripe product name in dashboard (live mode) — won't auto-update, update manually in Stripe dashboard
- Any existing purchased collections in Redis still have bundleUpgrade: false — these will now show the audio bar regardless (gift.html hardcodes true; app.html loads from token which now ignores the flag)

## Smoke Test Sequence
1. Complete a full purchase at $25 and confirm Stripe charges $25.00 AUD
2. Open a generated story and confirm audio bar is present with no paywall or upsell
3. Confirm "Loading narration…" shows immediately on story open (prefetch started)
4. Confirm audio bar updates to "Tap ▶ to listen to this story" when prefetch completes
5. Tap play and confirm narration plays from the beginning
6. Pause and resume — confirm resumes from same position
7. Tap ⬇ download button — confirm mp3 saves with correct filename
8. Go back to story list, reopen same story — confirm audio loads from cache (instant, no API call)
9. Open a gift link — confirm audio bar is shown and narration plays
10. Test on iOS Safari — confirm no autoplay errors, download works

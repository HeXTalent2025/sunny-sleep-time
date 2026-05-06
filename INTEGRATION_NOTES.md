# Sunny Stories — Video Feature Integration Notes

## ElevenLabs Voice

**Voice used:** Hannah — `M7ya1YbaeFaPXljg9BpK`

Hannah is a warm, natural Australian female voice on the ElevenLabs Multilingual v2 model. She was specified in the brief and no warmer or more explicitly maternal Australian voice was verified as available in the library at integration time. If a better fit is found in the ElevenLabs voice library, update `ELEVENLABS_VOICE_ID` in Vercel without any code changes.

---

## fal.ai Endpoints

| Purpose | Endpoint |
|---------|----------|
| Character illustration (no photo) | `fal-ai/flux/schnell` |
| Photo upload to stable URL | `fal.storage.upload()` via `@fal-ai/client` |
| Video clip generation | `fal-ai/kling-video/v2.6/pro/image-to-video` |

All endpoints match the spec. The `@fal-ai/client` npm package (`^1.0.0`) is used to handle fal.ai queue management and storage uploads — it was added to `package.json`. Run `npm install` after pulling this branch.

---

## Word Count Assumptions

| Story length | Target word count | Pages | Chars/page (approx) | Narration cost/page |
|---|---|---|---|---|
| 3 min | 300–400 words | 3 | ~780 chars | ~$0.09 |
| 5 min | 550–700 words | 3 | ~1,300 chars | ~$0.16 |

Both lengths use exactly 3 pages (and therefore 3 Kling video clips). This was confirmed as the correct spec — the old implementation generated 5 pages for 5-min stories, which has been corrected.

**Narration cost per story:** ~$0.28 (3 min) · ~$0.47 (5 min)  
**Video cost per story:** ~$1.26 (3 min, 3 × 6s) · ~$2.10 (5 min, 3 × 10s)

---

## Environment Variables Checklist

Set all of the following in **Vercel Dashboard → Settings → Environment Variables → Production AND Preview**:

| Variable | Description | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for story generation | Existing |
| `STRIPE_SECRET_KEY` | Stripe live mode key (`sk_live_...`) | Existing |
| `KV_REST_API_URL` | Upstash Redis URL (injected by Vercel integration) | Existing |
| `KV_REST_API_TOKEN` | Upstash Redis token (injected by Vercel integration) | Existing |
| `RESEND_API_KEY` | Resend email API key | Existing |
| `APP_URL` | `https://sunnystories.co` | Existing |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | **NEW — add before deploying** |
| `ELEVENLABS_VOICE_ID` | `M7ya1YbaeFaPXljg9BpK` (Hannah) | **NEW — add before deploying** |
| `FAL_API_KEY` | fal.ai API key | **NEW — add before deploying** |

---

## Known Limitations

1. **Video generation timeout:** Each Kling 2.6 Pro clip takes 25–45 seconds. Three clips for one story = 75–135 seconds total. The `api/video.js` function has a 120-second `maxDuration`. Multi-story batches in devvideo mode may hit this limit. If timeouts occur in production, increase `maxDuration` for `api/video.js` to 300 in `vercel.json`.

2. **Payments not integrated:** The video conversion flow shows a "coming soon" modal for payments. The `?devvideo=true` URL parameter bypasses this to allow full pipeline testing without Stripe. Waitlist submissions are saved to `localStorage` key `sst_video_waitlist`.

3. **Audio bar visible when no stories:** The ElevenLabs audio bar is rendered in the reader HTML but only functions when a story is open. On an empty reader state this is never shown.

4. **Photo upload size:** The 5MB file limit is enforced client-side only. Server-side body size limits on Vercel default to ~4.5MB — confirm this is sufficient or add a server-side check in `api/video.js`.

5. **`@fal-ai/client` version:** Pinned to `^1.0.0`. If the fal.ai SDK introduces breaking changes, check their changelog. The key API surface used is `fal.config()`, `fal.storage.upload()`, and `fal.subscribe()`.

---

## Recommended Manual Test Sequence

### 1. Narration only (no Stripe needed)
1. Generate a story collection normally (fill form → pay → read stories)
2. Open any story in the reader
3. Tap ▶ on the audio bar — should show "Generating narration…" then "Playing…"
4. Tap a different page — narration should stop; tap ▶ again to narrate the new page
5. Tap ▶ and let it finish — should auto-advance to next page and narrate it
6. Speed controls (Slow / Normal / Fast) should work without re-fetching audio
7. Navigate away and return to same story page — tap ▶ should play immediately (cached)

### 2. Video upsell card
1. After story generation, scroll below the story pills in My Books
2. Verify the video upsell card appears with pricing cards
3. Tap "1 story" — story pills should enter selection mode with sticky bar at bottom
4. Tap a story pill — it should highlight and the sticky bar should show the animate button
5. Tap "Cancel" — should exit selection mode cleanly
6. Tap "All 10 stories" — should go straight to s-video-setup

### 3. Full video pipeline with `?devvideo=true`
1. Navigate to `/app?devvideo=true`
2. Complete story generation normally
3. Open a story → read to "The End" screen
4. Tap "🎬 Bring this story to life" — should navigate to s-video-setup
5. Upload a photo OR type a description for the child hero
6. Tap "Generate animated video" — should skip payment modal and go to s-video-loading
7. Loading steps should animate; elapsed timer should tick
8. On completion, reader should open for that story with video clips playing in the scene area
9. Tap ▶ on audio bar — video and narration should play together
10. Advance pages — video should swap to the next clip

### 4. Waitlist modal (without devvideo)
1. Reach s-video-setup via any path (without `?devvideo=true`)
2. Tap "Generate animated video" — waitlist modal should appear
3. Enter email and tap "Notify me" — confirmation message should show, modal closes after 3s
4. Check `localStorage.getItem('sst_video_waitlist')` in browser console — entry should be there

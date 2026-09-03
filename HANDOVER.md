# ReliefRead — Handover

A readability-first reading workspace for dyslexic and borderline readers.
Natural audio with live word-highlight, eye-friendly fonts/spacing, a shame-free
phonetic writing coach, and shareable formatted readings. Danish + English.

---

## 1. Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** OverSkill platform — OAuth auth, Turso entity database, and the
  built-in AI/audio gateway. No custom server; all data goes through
  `overskill.entities.*` and `/api/ai/*`.
- **Hosting:** Cloudflare Workers (preview + production).
- **Design system:** warm cream / soft sage, zero red anywhere. Tokens live in
  `src/index.css`; fonts are Lexend + OpenDyslexic (CDN, graceful fallback).

## 2. Data model (entities)

| Entity | Purpose | Scope |
|---|---|---|
| `document` | A reading (title, `content_raw`, `language`, `listened`) | user-scoped |
| `note` | One note per document (`content`, `anchor_text`, `document_id`) | user-scoped |
| `lookup` | Explain/translate results — shared cache + per-user history | shared |
| `dictionary_word` | Personal "keep my spelling" list | user-scoped |
| `share_link` | Public snapshot of a document (`public_slug`, `settings_json`) | public_with_author |
| `user_setting` | Reading prefs + `plan` (free/premium) | user-scoped |
| `usage_counter` | Monthly `documents_created`, `tts_seconds_used` | user-scoped |
| `demo_activation` | Logs each DEMO code redemption | user-scoped |

## 3. API keys / config

Everything the app needs is already configured by the platform — **no manual key
setup is required**:

- **AI text (explain/translate):** `/api/ai/chat` — creator credits, no key.
- **HD narration:** `/api/ai/audio/tts` → ElevenLabs Flash v2.5, via the gateway
  (server holds the key). `src/lib/tts.ts` never sees a key.
- **Payments:** OverSkill Payments. Plan IDs are injected as
  `VITE_PLAN_PREMIUM_MONTHLY` / `VITE_PLAN_PREMIUM_ANNUAL`. Until card checkout
  is fully live, `DEMO2026` unlocks Premium instantly (Pricing → "Have a code?").
- **Auth:** OverSkill OAuth (email + password + magic link + social). Handled by
  the template's `/login` + `/callback` — do not modify.

## 4. How the audio + fallback logic works

The reader has **two engines** behind one API (`src/hooks/useReadAloud.ts`):

1. **Browser voice (default, free):** Web Speech API via `useSpeech`. Real
   `boundary` events give sample-accurate word highlighting. Works offline, no
   credits.
2. **HD voice (Premium, opt-in):** ElevenLabs clip from the cached gateway.
   Duration → per-word timings (`estimateWordTimings`); the `<audio>` element's
   `currentTime` drives the highlight. Speed is `playbackRate` (never
   regenerates).

**Fallback:** if an HD generation or playback fails, `useReadAloud` flips
`hdError`, calls `onFallback()` (which shows the "Using standard voice for now"
toast), and immediately restarts the **same** play action on the browser voice.
The app is never silent because an API failed. Caching (`src/lib/tts.ts`) means a
student replaying the same text before a test costs exactly one generation; TTS
seconds are counted only on a genuinely fresh generation.

**Sharing → 404:** `share_link` is fetched anonymously through `/api/share-view`
(presentation fields only — never user data). Revoking deletes the row, so the
public page (`/r/:slug`) immediately shows the calm "This link is no longer
available" page (see `fetchPublicShare` returning `null` on 404/410).

## 5. Demo content

`src/lib/demo-seed.ts` + the Dashboard "Load example readings" card seed, on the
signed-in account: a Danish 7th-grade history text, an English ocean-science
text, a dense unformatted legal paragraph (for the before/after stage moment),
one note per document, an active share link on Document 1, and a 3-word lookup
history. It is **idempotent** — it checks a sentinel title first, so re-running
never duplicates content.

## 6. Known limitations (Phase 2)

- **Scanned PDFs:** only selectable-text PDFs and .txt import today. Scanned
  images show a kind "photo scanning is coming soon" notice instead of failing.
- **External-app overlay:** reading help inside other apps/websites (browser
  extension) is planned, not built.
- **Real card checkout:** the OverSkill Payments embed is wired; while it's
  being finalized, `DEMO2026` is the unlock path. Cancellation for the
  demo/plan flag is self-serve (`downgradeToFree`); a real paid subscription is
  cancelled from the buyer's account.
- **HD voice fair use:** Premium includes 90 min/month of *fresh* AI narration;
  beyond that, fresh generations fall back to the browser voice (saved audio
  always replays free).

## 7. Deploy

Preview updates automatically on each change. To update the live site, open
**Publish** and click the main publish button (Publish to production).

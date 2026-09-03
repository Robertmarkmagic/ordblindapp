# ReliefRead

ReliefRead is a readability-first workspace for dyslexic and borderline readers. It combines calm reading settings, natural read-aloud, live word highlighting, phonetic writing support, notes, lookups, and shareable reading snapshots.

## Tech Stack

- React 18, TypeScript, Vite
- Tailwind CSS and shadcn/ui
- OverSkill SDK for auth, entities, AI, and audio gateway integration
- Cloudflare Workers build output

## Getting Started

```bash
npm install
npm run type-check
npx vitest run
npm run build
npm run dev
```

Copy `.env.example` to `.env` and fill in the OverSkill values when running outside the original OverSkill environment.

## Project Notes

- `HANDOVER.md` documents the product status, entity model, audio fallback logic, demo content, limitations, and deployment flow.
- The exported database schema/data is outside this app folder in the original OverSkill export.
- The app currently expects OverSkill platform services for auth, entity storage, AI text, TTS, and payments.

## Current Status

This exported version has been cleaned up for local development:

- TypeScript check passes.
- Unit tests pass.
- Production build passes.
- `.gitignore` and `.env.example` are included for GitHub readiness.

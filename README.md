# ReliefRead

ReliefRead er en dansk og engelsk læse- og skriveapp med fokus på ordblinde og andre, der har brug for en rolig og fleksibel tekstoplevelse.

## Teknologi

- React 18, TypeScript og Vite
- Supabase Auth, Postgres, Row Level Security og Edge Functions
- GitHub Actions og GitHub Pages på `https://reliefread.com`
- Resend via Supabase Custom SMTP til loginmails
- OpenAI via beskyttede Supabase Edge Functions til Riley og oplæsning

Appen har ingen aktiv afhængighed til den platform, den oprindeligt blev eksporteret fra.

## Lokal udvikling

```bash
npm install
cp .env.example .env
npm run type-check
npx vitest run
npm run build
npm run dev
```

Udfyld kun browser-sikre værdier i `.env`. Servernøgler skal altid gemmes som Supabase Edge Function-secrets og må aldrig ligge i Git.

## Backend

Databasestrukturen ligger i `supabase/migrations`, og backend-funktionerne ligger i `supabase/functions`.

- Alle brugerdata er afgrænset med Row Level Security.
- En ny bruger får automatisk profil, prøveabonnement og standardindstillinger.
- AI-funktioner kræver en gyldig Supabase-brugersession.
- Offentlige delingslinks udleverer kun den gemte delingskopi.
- Den gamle platforms data er arkiveret i det private databaseskema og er ikke tilgængelig fra browseren.

Se `supabase/README.md` for driftsopsætning.

## Udgivelse

Push til `main` starter typekontrol, tests og produktionsbygning. En godkendt version udgives automatisk til GitHub Pages.

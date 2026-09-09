# ReliefRead backend

Supabase-projekt: `qrtebmyjfpplnpknjhnb`

## Auth

Den offentlige app bruger adgangskodefri login med et sikkert engangslink.

Hosted Supabase skal have:

- Site URL: `https://reliefread.com`
- Redirect URL: `https://reliefread.com/callback`
- Lokal redirect URL: `http://localhost:8080/callback`

## Resend

Loginmails sendes gennem Supabase Auth og Resend Custom SMTP. SMTP-adgangskoden skal kun gemmes i Supabase-dashboardet.

Anbefalet afsender:

- Navn: `ReliefRead`
- Adresse: en godkendt adresse på `send.reliefread.com`
- SMTP-bruger: `resend`
- SMTP-vært og port: brug de aktuelle værdier fra Resend-dashboardet

## Edge Function-secrets

Følgende hemmelige værdier hører kun hjemme under Supabase Edge Functions > Secrets:

- `OPENAI_API_KEY`
- Valgfrit `OPENAI_MODEL`
- Valgfrit `OPENAI_TTS_MODEL`

Supabase leverer selv projektets publishable og secret keys til funktionerne. De må ikke kopieres til kildekoden.

## Sikkerhed

- Edge Functions bruger den nye Supabase-nøglemodel og foretager selv sessionstjek.
- `ai-chat`, `ai-object` og `text-to-speech` kræver en gyldig bruger.
- `public-share` er offentlig, men returnerer kun data for et gyldigt, tilfældigt delings-id.
- RLS er slået til på alle tabeller i det offentlige skema.
- Importerede gamle poster ligger i `private` og har ingen klientrettigheder.

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
- Valgfrit `JINA_READER_API_KEY` til højere kapacitet ved linkimport. Grundlæggende Jina Reader-adgang fungerer også uden en nøgle; rate limit deles da på serverens IP.

Supabase leverer selv projektets publishable og secret keys til funktionerne. De må ikke kopieres til kildekoden.

## Sikkerhed

- Edge Functions bruger den nye Supabase-nøglemodel og foretager selv sessionstjek.
- `ai-chat`, `ai-object` og `text-to-speech` kræver en gyldig bruger.
- `public-share` er offentlig, men returnerer kun data for et gyldigt, tilfældigt delings-id.
- RLS er slået til på alle tabeller i det offentlige skema.
- Importerede gamle poster ligger i `private` og har ingen klientrettigheder.

## Import fra hjemmesider

Deploy `web-import` med platformens `verify_jwt = false`, da funktionen selv validerer brugersessionen via `auth.getUser(token)`, ligesom appens øvrige beskyttede funktioner. Bevar altid dette sessionstjek. Deploy-filerne er `web-import/index.ts`, `web-import/handler.ts` og `_shared/web-source.ts`. Supabase SDK er fastlåst til 2.116.0 i den nye funktion.

Migrationen `20261006235502_add_document_source_url.sql` tilføjer en valgfri kildeadresse til eksisterende private dokumenter. De nuværende ejerbaserede RLS-politikker gælder også denne kolonne.

Jina AI Reader er ekstern databehandler for de offentlige webadresser, som brugeren vælger at hente. Appen viser dette inden hentning og på privatlivssiden. Der sendes ingen Supabase-token eller cookies til Jina. Funktionen udleverer kun ren tekst, har 25 sekunders upstream-timeout, højst 2 MB svar og højst 100.000 tegn i en læsning. Adgangsblokering, login, rate limits og manglende tekst giver særskilte fejlmeddelelser. Der logges ikke ind på tredjepartssider.

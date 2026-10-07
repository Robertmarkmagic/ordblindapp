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

## Læs tekst, filer og webadresser

Ny læsning har tre valg: **Indsæt tekst**, **Upload fil** (.txt og PDF med markerbar tekst) og **Indsæt link**. Linkimport henter den offentligt tilgængelige læsetekst fra én side, viser en redigerbar forhåndsvisning og bruger sidens titel. Efter Start læsning gemmes teksten privat på kontoen og åbnes med de samme oplæsnings-, markerings-, ordbogs- og noteværktøjer. Kildeadressen gemmes i `documents.source_url`, og læseren har et link til originalsiden.

Den beskyttede `web-import`-funktion bruger Jina AI Reader med browserrendering og ren tekst. Kun den valgte offentlige URL sendes til Jina AI. Brugerens session, cookies og andre gemte tekster sendes ikke. Funktionen kontrollerer brugerens session, afviser lokale adresser/IP-adresser/loginoplysninger og begrænser svartid, svarstørrelse og tekstlængde. Backend laver ingen direkte netværkskald til det brugerangivne domæne. HTML/scripts afvikles ikke i ReliefRead.

På Wattpad bruges kapitlets URL, ikke `/story/`-forsiden. Der er ingen automatisk hentning af en hel bog eller alle kapitler. Login, betalingsmure, botblokering og sider uden læsetekst giver vejledning om at åbne originalsiden og indsætte tekst selv. Funktionen indlejrer ikke tredjepartssiden i appen og overtager ikke en Wattpad-session. Til oplæsning direkte på en allerede indlogget tredjepartsside kræves en særskilt browserudvidelse.

Backend-funktionen og migrationen skal være tilgængelige før frontend-udgivelse. Se `supabase/README.md`.

## Grammatikmode

Skriveværkstedet og forsiden bruger det samme læringspanel med tre visninger: **Min tekst**, **Regler og eksempler** og **Øv selv**. Grammatikmode kan slås til og fra. Tekstsproget registreres automatisk og kan vælges manuelt, uafhængigt af brugerfladens sprog.

I tekstvisningen kan brugeren trykke på genkendte ord for at undersøge ordklasser, grundled (×) og udsagnsled (○). Hele teksten bevares med tegn og linjeskift. Analysen bruger et begrænset ordforråd og markerer genkendte ord, ikke nødvendigvis hele grundleddet eller udsagnsleddet. Det forklares i panelet og i reglerne. Riley kan vejlede i brugerens egen opgave, ét trin ad gangen, uden automatisk at omskrive teksten.

Mulige manglende kommaer vises som gule, klikbare markeringer på de relevante steder i teksten. Forklaringen åbnes først; brugeren vælger derefter at indsætte ét komma. Den lokale kommahjælp genkender enkle danske og engelske mønstre, blandt andet helsætninger og indledende ledsætninger. Danske startkommaer er et særskilt valg, der også sendes til **Tjek min tekst**. Kommaforslag fra denne grundigere gennemgang vises i teksten, når et forslag kun tilføjer kommaer og kan placeres entydigt i den uændrede original. Flertydige og gamle forslag markeres ikke.

Reglerne dækker blandt andet ordklasser og sætningsled, hele grundled og udsagnsled, bøjning, tider, dansk nutids-r, engelsk kongruens, helsætninger/ledsætninger og kommaer. Der er 13 danske og 12 engelske emner med eksempler, trin og øvelser samt den eksisterende udvidede kommaoversigt. Øvelser giver hints og lader brugeren prøve igen, før den rigtige løsning forklares. Ingen automatiske kommaforslag er ikke en garanti for korrekt kommatering.

Regelgrundlag: [Dansk Sprognævns kommagrammatik](https://sproget.dk/typiske-problemer/komma/kommagrammatik/), [r-problemer](https://sproget.dk/typiske-problemer/r-problemer/) og [Purdue OWL](https://owl.purdue.edu/owl/general_writing/punctuation/commas/extended_rules_for_commas.html).

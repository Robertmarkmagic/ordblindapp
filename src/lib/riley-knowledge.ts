export type RileyLanguage = "da" | "en";

type KnowledgeEntry = {
  words: string[];
  da: string;
  en: string;
};

const entries: KnowledgeEntry[] = [
  {
    words: ["hvad kan", "funktion", "værktøj", "hvordan virker", "hvad er reliefread", "help with", "what can", "how does"],
    da: "ReliefRead samler oplæsning, markering, tale-til-tekst, skrivehjælp, ordforslag, grammatik, komma, ordbog, PDF-filer og noter. Start på Min ReliefRead, og vælg det værktøj, du vil bruge. Riley er altid tilgængelig nederst på siden.",
    en: "ReliefRead brings together read-aloud, highlighting, speech-to-text, writing help, word suggestions, grammar, commas, a dictionary, PDFs and notes. Start in My ReliefRead and choose the tool you need. Riley stays available at the bottom of the page.",
  },
  {
    words: ["læst højt", "oplæs", "læse", "stemme", "høre tekst", "read aloud", "voice", "listen"],
    da: "Vælg Læs på dashboardet, indsæt tekst eller upload en PDF, og åbn den i læseren. Her kan du læse hele teksten, en sætning, et ord eller en markering højt og tilpasse tempoet.",
    en: "Choose Read on the dashboard, paste text or upload a PDF, and open it in the reader. You can hear the whole text, a sentence, a word or a selection and adjust the speed.",
  },
  {
    words: ["skrivehjælp", "stav", "grammatik", "komma", "tegnsæt", "ordforslag", "write", "spelling", "grammar", "comma", "suggestion"],
    da: "Åbn Skriv på dashboardet. Skriveværkstedet kan hjælpe separat med stavning, grammatik, komma, tegnsætning og ordforslag. Du bestemmer selv, hvilke kontroller der er slået til, og originalteksten bevares.",
    en: "Open Write from the dashboard. The writing studio can help separately with spelling, grammar, commas, punctuation and word suggestions. You choose which checks are active, and the original is preserved.",
  },
  {
    words: ["tale til tekst", "dikter", "mikrofon", "indtal", "speech to text", "dictat", "microphone"],
    da: "Vælg Tal eller åbn skriveværkstedet og tryk på mikrofonen. Det, du siger, bliver sat ind i teksten ved markøren. Browseren kan bede om adgang til mikrofonen første gang.",
    en: "Choose Dictate or open the writing studio and press the microphone. What you say is inserted at the cursor. Your browser may ask for microphone access the first time.",
  },
  {
    words: ["ordbog", "betydning", "bøjning", "oversæt", "udtale", "dictionary", "meaning", "pronunciation", "translate"],
    da: "Ordbogen viser betydning, korrekt stavning, engelsk oversættelse, bøjning og udtale. Åbn først en tekst i læseren, og vælg Ordbog i værktøjslinjen.",
    en: "The dictionary shows meaning, spelling, English translation, inflection and pronunciation. Open a text in the reader and choose Dictionary in the toolbar.",
  },
  {
    words: ["pdf", "scan", "billede", "ocr", "papir", "photo", "image"],
    da: "Du kan allerede uploade tekstfiler og PDF-filer med markerbar tekst via Scan eller upload. ReliefRead trækker teksten ud og åbner den i læseren. OCR til papirfotos og helt scannede PDF-filer er under udvikling og skal ikke forveksles med den nuværende PDF-import.",
    en: "You can already upload text files and PDFs containing selectable text through Scan or upload. ReliefRead extracts the text and opens it in the reader. OCR for paper photos and fully scanned PDFs is still in development.",
  },
  {
    words: ["note", "notesbog", "notebook"],
    da: "Vælg Noter på dashboardet for at se dine noter. I læseren kan du markere tekst og knytte en note til det valgte sted, så teksten og din tanke bliver gemt sammen.",
    en: "Choose Notes on the dashboard to see your notes. In the reader you can select text and attach a note to that passage, keeping the source and your thought together.",
  },
  {
    words: ["tema", "farve", "minimal", "pinky", "wood", "ocean", "night mode", "highlighter", "sticker", "theme", "color", "colour"],
    da: "Åbn din profil og vælg Indstillinger. Her kan du vælge appens tema, tekstfarve, highlighterfarve og værktøjslinje. Minimal bruger sort tekst, Night Mode bruger hvid tekst, og dine læsevalg følger med ind i læseren.",
    en: "Open your profile and choose Settings. You can choose the app theme, text color, highlighter color and toolbar. Minimal uses black text, Night Mode uses white text, and your reading choices follow you into the reader.",
  },
  {
    words: ["log ind", "login", "profil", "konto", "magic link", "sign in", "account"],
    da: "ReliefRead bruger et sikkert engangslink i stedet for en adgangskode. Skriv din e-mail på login-siden, åbn mailen fra ReliefRead, og tryk på loginlinket. Linket kan kun bruges én gang og udløber efter kort tid.",
    en: "ReliefRead uses a secure one-time link instead of a password. Enter your email on the login page, open the ReliefRead email and use the sign-in link. It can only be used once and expires after a short time.",
  },
  {
    words: ["gratis", "prøve", "betaling", "pris", "abonnement", "free", "trial", "price", "pricing", "subscription"],
    da: "Du kan oprette gratis prøveadgang uden betalingskort. Start på siden Prøv ReliefRead gratis. Prisoversigten findes under Priser, og du kan altid ændre dine valg senere.",
    en: "You can create free trial access without a payment card. Start on the Try ReliefRead free page. Pricing is shown under Pricing, and you can change your choices later.",
  },
  {
    words: ["riley", "ai", "kunstig intelligens", "assistant"],
    da: "Jeg er Riley, ReliefReads hjælper. Du kan spørge mig om appen, få en tekst forklaret, gøre den lettere, få skrivehjælp eller stille spørgsmål til et dokument. Markér gerne tekst først, hvis dit spørgsmål handler om et bestemt afsnit.",
    en: "I am Riley, ReliefRead's helper. Ask me about the app, request an explanation, simplify text, get writing help or ask about a document. Select text first when your question is about a specific passage.",
  },
];

const appTerms = [
  "reliefread", "appen", "app", "dashboard", "forsiden", "værktøj", "funktion", "hvor finder", "hvordan bruger",
  "login", "profil", "indstilling", "tema", "pdf", "scan", "ordbog", "oplæs", "skrivehjælp", "riley",
];

function normalize(text: string) {
  return text.toLocaleLowerCase("da-DK").replace(/\s+/g, " ").trim();
}

export function answerReliefReadQuestion(question: string, language: RileyLanguage): string | null {
  const text = normalize(question);
  if (!text || !appTerms.some((term) => text.includes(term))) return null;

  let best: KnowledgeEntry | null = null;
  let score = 0;
  for (const entry of entries) {
    const nextScore = entry.words.reduce((total, word) => total + (text.includes(word) ? Math.max(1, word.split(" ").length) : 0), 0);
    if (nextScore > score) {
      best = entry;
      score = nextScore;
    }
  }

  if (best) return best[language];
  return language === "da"
    ? "Jeg kan hjælpe dig med at finde rundt i ReliefRead. Du kan spørge om oplæsning, skrivning, tale-til-tekst, ordbog, PDF, noter, temaer, login eller gratis prøveadgang."
    : "I can help you find your way around ReliefRead. Ask about read-aloud, writing, speech-to-text, the dictionary, PDFs, notes, themes, sign-in or the free trial.";
}

import type { GrammarLanguage } from "./grammar-learning";

export interface GrammarLesson {
  id: string;
  category: "grammar" | "comma";
  title: string;
  explanation: string;
  example: string;
  steps: string[];
  exercise: { sentence: string; question: string; hint: string; choices: string[]; answer: number; feedback: string };
}

const da: GrammarLesson[] = [
  {
    id: "subject", category: "grammar", title: "Grundled. Sæt kryds ×",
    explanation: "Grundleddet fortæller, hvem eller hvad udsagnsleddet handler om. Det kan bestå af ét ord eller flere ord.",
    example: "Den lille hund × sover ○.", steps: ["Find først udsagnsleddet: sover.", "Spørg: Hvem eller hvad sover?", "Svar: Den lille hund. Hele dette led er grundled."],
    exercise: { sentence: "Min søster læser en bog.", question: "Hvad er hele grundleddet?", hint: "Hvem læser? Tag alle de ord med, der beskriver personen.", choices: ["Min søster", "læser", "en bog"], answer: 0, feedback: "Min søster er den, der læser. Begge ord hører med til grundleddet." },
  },
  {
    id: "predicate", category: "grammar", title: "Udsagnsled. Sæt bolle ○",
    explanation: "Udsagnsleddet fortæller om handlingen eller tilstanden. Det kan indeholde flere udsagnsord, for eksempel har læst.",
    example: "Hun × har læst ○ bogen.", steps: ["Spørg, hvad der sker, eller hvilken tilstand sætningen beskriver.", "Se efter udsagnsord. Prøv at sætte jeg foran en bøjet form.", "Find både hjælpeudsagnsord og hovedudsagnsord, hvis der er flere."],
    exercise: { sentence: "Vi har skrevet et brev.", question: "Hvad er hele udsagnsleddet?", hint: "Der er to udsagnsord. Det ene hjælper med at fortælle tiden.", choices: ["Vi", "har skrevet", "et brev"], answer: 1, feedback: "Har skrevet er det samlede udsagnsled. Har er hjælpeudsagnsord, og skrevet er hovedudsagnsord." },
  },
  {
    id: "word-classes", category: "grammar", title: "Ordklasse og sætningsled",
    explanation: "Ordklasse beskriver typen af et ord. Sætningsled beskriver ordets opgave i en bestemt sætning. Et navneord er derfor ikke altid grundled.",
    example: "Hunden ser katten. Katten ser hunden.", steps: ["Hunden og katten er navneord i begge sætninger.", "Spørg, hvem der ser, for at finde grundleddet.", "Det samme ord kan have en anden opgave, når sætningen ændres."],
    exercise: { sentence: "Pigen ser hunden.", question: "Hvilket udsagn beskriver hunden korrekt her?", hint: "Hunden er et navneord. Men hvem er det, der ser?", choices: ["Hunden er grundled", "Hunden er navneord og genstandsled", "Hunden er udsagnsled"], answer: 1, feedback: "Pigen er grundled. Hunden er den, pigen ser, og er derfor genstandsled her." },
  },
  {
    id: "nouns", category: "grammar", title: "Navneord og bøjning",
    explanation: "Navneord kan betegne mennesker, ting, steder og begreber. Mange kan stå med en eller et og bøjes i ental, flertal og bestemt form.",
    example: "En bog. Bogen. Flere bøger. Bøgerne.", steps: ["Prøv at sætte en eller et foran ordet.", "Undersøg, hvordan det bøjes. Brug ordbogen ved tvivl.", "Et ords endelse alene fortæller ikke sikkert dets ordklasse."],
    exercise: { sentence: "Barnet læser to bøger.", question: "Hvilket ord er et navneord i flertal?", hint: "Det beskriver flere ting, barnet kan læse.", choices: ["Barnet", "læser", "bøger"], answer: 2, feedback: "Bøger er flertal af bog. Barnet er også et navneord, men det står i ental." },
  },
  {
    id: "adjectives", category: "grammar", title: "Tillægsord",
    explanation: "Tillægsord beskriver egenskaber. Mange ændrer form, når navneordets køn eller antal ændres, og mange kan gradbøjes.",
    example: "En grøn bog. Et grønt hus. Grønne bøger.", steps: ["Find det navneord, der beskrives.", "Spørg, hvordan det er.", "Kontrollér tillægsordets form sammen med navneordet."],
    exercise: { sentence: "Det er et ___ hus.", question: "Hvilken form passer til hus?", hint: "Hus er et intetkønsord: et hus.", choices: ["grøn", "grønt", "grønne"], answer: 1, feedback: "Det hedder et grønt hus. Tillægsordet får her -t, fordi hus står med et." },
  },
  {
    id: "pronouns", category: "grammar", title: "Stedord",
    explanation: "Stedord kan stå i stedet for et navn eller et navneord. Formen afhænger blandt andet af, hvilken opgave ordet har i sætningen.",
    example: "Hun læser. Jeg hjælper hende.", steps: ["Find personen eller tingen, ordet henviser til.", "Undersøg, om ordet er grundled eller har en anden opgave.", "Sammenlign for eksempel hun og hende."],
    exercise: { sentence: "___ læser bogen.", question: "Hvilket stedord passer som grundled?", hint: "Sammenlign med Hun læser og Jeg hjælper hende.", choices: ["Hende", "Hun", "Hendes"], answer: 1, feedback: "Hun bruges som grundled her. Hende bruges for eksempel i Jeg hjælper hende." },
  },
  {
    id: "tense", category: "grammar", title: "Udsagnsordenes tid",
    explanation: "Udsagnsord kan fortælle, om noget sker nu, skete tidligere eller er sket. Se på hele udsagnsleddet, når der er hjælpeudsagnsord.",
    example: "Jeg skriver. Jeg skrev. Jeg har skrevet.", steps: ["Find udsagnsleddet.", "Sammenlign nutid, datid og førnutid.", "Læs sætningen sammen med tidsord som nu eller i går."],
    exercise: { sentence: "I går skrev jeg et brev.", question: "Hvilken tid står skrev i?", hint: "Sammenlign skriver nu med skrev i går.", choices: ["Nutid", "Datid", "Førnutid"], answer: 1, feedback: "Skrev er datid. Har skrevet ville være førnutid." },
  },
  {
    id: "present-r", category: "grammar", title: "Nutids-r og navnemåde",
    explanation: "Ved ord som køre og kører kan r være svært at høre. Prøv at erstatte ordet med spise eller spiser og se, hvilken form der passer.",
    example: "Jeg kører. Jeg vil køre.", steps: ["Prøv Jeg spiser og Jeg spise. Spiser passer.", "Prøv Jeg vil spise og Jeg vil spiser. Spise passer.", "Brug samme bøjning af det ord, du er i tvivl om."],
    exercise: { sentence: "Jeg vil ___ hjem.", question: "Hvilken form passer?", hint: "Ville du sige Jeg vil spise eller Jeg vil spiser?", choices: ["køre", "kører"], answer: 0, feedback: "Køre passer. Efter vil bruger vi her navnemåde, ligesom i vil spise." },
  },
  {
    id: "clauses", category: "grammar", title: "Helsætning og ledsætning",
    explanation: "En helsætning kan stå selvstændigt. En ledsætning indgår som en del af en større sætning. Ikke-prøven kan hjælpe med at se forskellen.",
    example: "Hun kommer ikke. Fordi hun ikke kommer …",
    steps: ["Find grundled og udsagnsled.", "Prøv, hvor ikke kan stå.", "Hun kommer ikke er en helsætning. Fordi hun ikke kommer har ledsætningsordstilling."],
    exercise: { sentence: "Jeg læser, fordi jeg ikke kan sove.", question: "Hvilken del er ledsætningen?", hint: "Se på den del, der begynder med fordi.", choices: ["Jeg læser", "fordi jeg ikke kan sove", "hele teksten"], answer: 1, feedback: "Fordi jeg ikke kan sove er ledsætningen. Den forklarer, hvorfor jeg læser." },
  },
  {
    id: "comma-main", category: "comma", title: "Komma mellem helsætninger",
    explanation: "Når to helsætninger forbindes med for eksempel og eller men, skal kommaet stå før bindeordet. To udsagnsord alene er ikke nok.",
    example: "Jeg læser, og du skriver. Jeg læser og skriver.", steps: ["Find grundled og udsagnsled på begge sider.", "Undersøg, om der er to selvstændige sætninger.", "Hvis de deler grundled, skal du ikke automatisk sætte komma før og."],
    exercise: { sentence: "Jeg læser og du skriver.", question: "Hvor skal kommaet stå?", hint: "Der er både jeg læser og du skriver.", choices: ["Jeg læser, og du skriver.", "Jeg læser og, du skriver.", "Jeg, læser og du skriver."], answer: 0, feedback: "Kommaet står før og, fordi ordet forbinder to helsætninger." },
  },
  {
    id: "comma-end", category: "comma", title: "Slutkomma efter ledsætning",
    explanation: "Når en ledsætning slutter, og helsætningen fortsætter, skal der normalt et komma. Det gælder også, når du skriver uden startkomma.",
    example: "Hvis du læser, skriver jeg.", steps: ["Find ledsætningen: Hvis du læser.", "Find stedet, hvor den slutter.", "Sæt komma ved overgangen til skriver jeg."],
    exercise: { sentence: "Når hun kommer går vi.", question: "Hvilken kommatering passer?", hint: "Ledsætningen er Når hun kommer.", choices: ["Når, hun kommer går vi.", "Når hun kommer, går vi.", "Når hun kommer går, vi."], answer: 1, feedback: "Slutkommaet står efter kommer, hvor ledsætningen slutter." },
  },
  {
    id: "comma-start", category: "comma", title: "Valgfrit startkomma",
    explanation: "Du kan vælge med eller uden startkomma før ledsætninger. Hold dig til samme valg i teksten. Valget ændrer ikke på nødvendige slutkommaer.",
    example: "Jeg læser fordi du skriver. Jeg læser, fordi du skriver.", steps: ["Find ledsætningens begyndelse.", "Vælg med eller uden startkomma.", "Brug samme stil gennem teksten. Nogle forbindelser kræver nærmere analyse."],
    exercise: { sentence: "Jeg ved at hun kommer.", question: "Hvad er rigtigt om kommaet før at her?", hint: "Startkomma før denne ledsætning er et valg.", choices: ["Det er altid nødvendigt", "Det er valgfrit, når stilen er konsekvent", "Det er altid forkert"], answer: 1, feedback: "Begge versioner er mulige her. Du skal følge samme startkommapraksis i teksten." },
  },
  {
    id: "comma-list", category: "comma", title: "Komma i opremsninger",
    explanation: "Adskil sideordnede dele i en opremsning med komma, når der ikke står et bindeord mellem dem. Sæt ikke automatisk komma før det sidste og.",
    example: "Jeg køber æbler, pærer og bananer.", steps: ["Find de ting eller led, der opremses.", "Se, hvilke dele der er forbundet med og eller eller.", "Sæt komma mellem de øvrige sideordnede dele."],
    exercise: { sentence: "Vi har blyanter bøger og papir.", question: "Hvilken version passer til denne opremsning?", hint: "Der mangler et komma mellem de første to ting.", choices: ["Vi har blyanter, bøger og papir.", "Vi har, blyanter bøger og papir.", "Vi har blyanter bøger, og papir."], answer: 0, feedback: "Blyanter og bøger adskilles med komma. Det sidste og forbinder bøger og papir." },
  },
];

const en: GrammarLesson[] = [
  { id: "subject", category: "grammar", title: "Subject. Mark ×", explanation: "The subject tells us who or what the clause is about. It may contain several words.", example: "The small dog × sleeps ○.", steps: ["Find the verb: sleeps.", "Ask who or what sleeps.", "The whole phrase The small dog is the subject."], exercise: { sentence: "My sister reads a book.", question: "What is the whole subject?", hint: "Who reads? Include the words that identify that person.", choices: ["My sister", "reads", "a book"], answer: 0, feedback: "My sister is the whole subject. Both words belong to it." } },
  { id: "predicate", category: "grammar", title: "Verb phrase. Mark ○", explanation: "The verb phrase expresses an action or state. Auxiliary verbs can be part of it.", example: "She × has read ○ the book.", steps: ["Ask what happens or what state is described.", "Find the main verb.", "Include any auxiliary verbs."], exercise: { sentence: "We have written a letter.", question: "What is the whole verb phrase?", hint: "One verb helps express the tense.", choices: ["We", "have written", "a letter"], answer: 1, feedback: "Have written is the whole verb phrase. Have is an auxiliary." } },
  { id: "word-classes", category: "grammar", title: "Word classes and sentence roles", explanation: "A word class describes the type of word. A sentence role describes what it does in this sentence.", example: "The dog sees the cat. The cat sees the dog.", steps: ["Dog and cat are nouns in both sentences.", "Ask who sees to find the subject.", "A noun can serve as a subject or an object."], exercise: { sentence: "The girl sees the dog.", question: "What is the role of the dog here?", hint: "Who sees, and who is seen?", choices: ["Subject", "Object", "Verb"], answer: 1, feedback: "The girl is the subject. The dog is the object of sees." } },
  { id: "nouns", category: "grammar", title: "Nouns and number", explanation: "Nouns name people, things, places and ideas. Many have singular and plural forms, including irregular plurals.", example: "One book. Two books. One child. Two children.", steps: ["Identify what the word names.", "Check whether it refers to one or more.", "Use the dictionary for irregular forms."], exercise: { sentence: "The child reads two books.", question: "Which noun is plural?", hint: "It refers to more than one thing to read.", choices: ["child", "reads", "books"], answer: 2, feedback: "Books is the plural of book. Child is singular." } },
  { id: "adjectives", category: "grammar", title: "Adjectives", explanation: "Adjectives describe properties of nouns. Many can be compared using -er/-est or more/most.", example: "A small house. A smaller house. The smallest house.", steps: ["Find the noun being described.", "Ask what it is like.", "Check the comparison form if things are being compared."], exercise: { sentence: "This book is more interesting.", question: "Which word is an adjective?", hint: "Which word describes what the book is like?", choices: ["book", "is", "interesting"], answer: 2, feedback: "Interesting describes the book. More forms the comparison." } },
  { id: "pronouns", category: "grammar", title: "Pronouns", explanation: "Pronouns can stand in place of nouns. Subject forms and object forms have different jobs.", example: "She reads. I help her.", steps: ["Find the person or thing referred to.", "Identify the sentence role.", "Choose a subject or object form."], exercise: { sentence: "___ reads the book.", question: "Which pronoun works as the subject?", hint: "Compare She reads with I help her.", choices: ["Her", "She", "Hers"], answer: 1, feedback: "She is the subject form. Her is an object form in I help her." } },
  { id: "tense", category: "grammar", title: "Verb tense", explanation: "Verb forms help show when an action occurs. Look at auxiliary verbs as well as the main verb.", example: "I write. I wrote. I have written.", steps: ["Find the whole verb phrase.", "Compare present, past and present perfect.", "Read it alongside time expressions."], exercise: { sentence: "Yesterday I wrote a letter.", question: "What tense is wrote?", hint: "Compare write today with wrote yesterday.", choices: ["Present", "Past", "Present perfect"], answer: 1, feedback: "Wrote is past tense. Have written is present perfect." } },
  { id: "agreement", category: "grammar", title: "Subject and verb agreement", explanation: "The verb must agree with its subject. In the simple present, he, she and it usually take a verb ending in -s.", example: "She writes. They write.", steps: ["Find the subject.", "Check its person and number.", "Choose the matching verb form."], exercise: { sentence: "She ___ every day.", question: "Which verb form fits?", hint: "She is third-person singular.", choices: ["write", "writes"], answer: 1, feedback: "Writes agrees with she in the simple present." } },
  { id: "clauses", category: "grammar", title: "Independent and dependent clauses", explanation: "An independent clause can stand as a sentence. A dependent clause needs a main clause to complete its message.", example: "She arrives. When she arrives …", steps: ["Find the subject and verb.", "Look for a word such as when or because.", "Ask whether the clause can stand by itself."], exercise: { sentence: "I read because I cannot sleep.", question: "Which part is dependent?", hint: "Look at the clause introduced by because.", choices: ["I read", "because I cannot sleep", "the whole sentence"], answer: 1, feedback: "Because I cannot sleep is a dependent clause giving the reason." } },
  { id: "comma-main", category: "comma", title: "Commas between independent clauses", explanation: "Use a comma before a coordinating conjunction joining two independent clauses. Two verbs sharing one subject do not automatically need a comma.", example: "I read, and you write. I read and write.", steps: ["Find a subject and verb on each side.", "Check that both clauses can stand independently.", "Place the comma before the conjunction."], exercise: { sentence: "I read and you write.", question: "Where does the comma belong?", hint: "There are two independent clauses.", choices: ["I read, and you write.", "I read and, you write.", "I, read and you write."], answer: 0, feedback: "The comma comes before and, joining two independent clauses." } },
  { id: "comma-end", category: "comma", title: "Introductory dependent clauses", explanation: "When a dependent clause introduces the sentence, use a comma where it ends. A dependent clause following the main clause often needs no comma.", example: "If you read, I write. I write if you read.", steps: ["Find the introductory dependent clause.", "Locate where the main clause starts.", "Place the comma between the clauses."], exercise: { sentence: "When she arrives we leave.", question: "Which version works?", hint: "The introductory clause is When she arrives.", choices: ["When, she arrives we leave.", "When she arrives, we leave.", "When she arrives we, leave."], answer: 1, feedback: "The comma closes the introductory clause after arrives." } },
  { id: "comma-list", category: "comma", title: "Commas in lists", explanation: "Use commas to separate three or more items in a list. The final comma before and depends on the style you use and clarity.", example: "We bought apples, pears and bananas.", steps: ["Identify the separate items.", "Separate the first items with commas.", "Keep the final-comma style consistent."], exercise: { sentence: "We have pencils books and paper.", question: "Which version separates the first two items?", hint: "A comma is missing after pencils.", choices: ["We have pencils, books and paper.", "We have, pencils books and paper.", "We have pencils books and, paper."], answer: 0, feedback: "The comma separates pencils and books. Some styles also use a comma before and." } },
];

export function getGrammarLessons(language: GrammarLanguage): GrammarLesson[] {
  return language === "da" ? da : en;
}

export function buildGrammarCoachPrompt(text: string, language: GrammarLanguage, topic?: string): string {
  const instruction = language === "da"
    ? "Hjælp mig med at lære grammatik i denne tekst. Vejled ét trin ad gangen og lad mig prøve selv, før du viser løsningen. Skeln mellem ordklasser og sætningsled. Forklar grundled, hele udsagnsled og eventuelle kommaer med eksempler fra min tekst. Respektér mit valg om startkomma, og spørg hvis det er uklart. Ret ikke teksten automatisk."
    : "Help me learn grammar in this text. Guide me one step at a time and let me try before showing the answer. Distinguish word classes from sentence roles. Explain the subject, the whole verb phrase and any commas using examples from my text. Do not rewrite the text automatically.";
  return `${instruction}${topic ? `\n${language === "da" ? "Fokus" : "Focus"}: ${topic}` : ""}\n\n${text.slice(0, 6000)}`;
}

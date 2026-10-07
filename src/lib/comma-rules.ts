export type CommaRule = {
  title: string;
  explanation: string;
  example: string;
};

export const COMMA_RULES: CommaRule[] = [
  { title: "Kryds og bolle", explanation: "Sæt kryds ved grundleddet og bolle ved udsagnsleddet. Flere sæt kryds og bolle viser, at sætningen består af flere sætningsdele.", example: "Sofie × læser ○, og Amir × skriver ○." },
  { title: "Opremsninger", explanation: "Sæt komma mellem sideordnede ord og led, når de ikke er bundet sammen af og, men eller eller.", example: "Vi købte æbler, pærer og bananer." },
  { title: "Titler og adresser", explanation: "Adskil sideordnede titler, betegnelser og dele af en adresse med komma.", example: "Maja Holm, lærer, Aarhus." },
  { title: "Forstærkende gentagelse", explanation: "En gentagelse, der bruges til at forstærke et ord eller udtryk, adskilles med komma.", example: "Det var en meget, meget lang dag." },
  { title: "Selvstændige sætningsdele", explanation: "Et selvstændigt indskud kan afgrænses med komma, når det hjælper læseren med at forstå sætningen.", example: "Opgaven er, efter min mening, tydelig." },
  { title: "Appositioner", explanation: "Et forklarende ekstraled, der kan undværes, skal stå mellem kommaer.", example: "Min nabo, en dygtig kok, laver middagen." },
  { title: "Udråb og tiltale", explanation: "Udråb, navne i direkte tiltale og små spørgende tilføjelser adskilles fra resten.", example: "Freja, vil du hjælpe? Ja, det vil jeg." },
  { title: "Forklaringer og præciseringer", explanation: "Forklarende eller præciserende tilføjelser afgrænses med komma.", example: "Vi mødes fredag, altså dagen før festen." },
  { title: "Parentetiske relativsætninger", explanation: "En relativsætning med ekstra information, som kan fjernes uden at ændre hovedbudskabet, står mellem kommaer.", example: "Bogen, som ligger på bordet, er min." },
  { title: "Komma før men", explanation: "Komma før men er altid en sikker løsning. Andre regler kan gøre kommaet nødvendigt.", example: "Hun var træt, men hun fortsatte." },
  { title: "Direkte tale", explanation: "Adskil replikken fra den del, der fortæller, hvem der taler.", example: "“Jeg kommer nu,” sagde han." },
  { title: "Mellem helsætninger", explanation: "Sæt komma mellem helsætninger, især når de forbindes med og, eller, men, for eller så.", example: "Jeg læser opgaven, og du skriver svaret." },
  { title: "Helsætninger med udeladte ord", explanation: "Komma kan markere grænsen, når grundled eller udsagnsled gentages eller er underforstået.", example: "Nora valgte den blå, og Emil den grønne." },
  { title: "Bydemåde", explanation: "Sætninger i bydemåde fungerer som helsætninger med et underforstået grundled. Meget tæt forbundne bydeformer kan stå uden komma.", example: "Læs teksten, og svar på spørgsmålene." },
  { title: "Find en ledsætning", explanation: "Brug ikke-prøven. Kan ikke stå mellem grundled og udsagnsled, er der typisk tale om en ledsætning.", example: "Når hun ikke kommer, begynder vi." },
  { title: "Sæt slutkomma", explanation: "Sæt som hovedregel komma efter en ledsætning, når helsætningen fortsætter.", example: "Hvis det regner, tager vi bussen." },
  { title: "Vælg startkomma", explanation: "Du kan vælge komma før ledsætninger eller lade være. Brug samme valg gennem hele teksten.", example: "Jeg ved(,) at du kommer." },
  { title: "Sideordnede ledsætninger", explanation: "Sæt komma mellem ledsætninger, der er sideordnede og har samme funktion i helsætningen.", example: "Hun fandt stedet, hvor vi mødtes, og hvor vi spiste." },
  { title: "Selvstændige ledsætninger", explanation: "En parentetisk ledsætning, der blot tilføjer ekstra information, skal afgrænses med komma.", example: "Min cykel, som er helt ny, står udenfor." },
  { title: "Flyttet startkomma", explanation: "Nogle småord hører så tæt sammen med ledsætningen, at startkommaet placeres før hele forbindelsen.", example: "Han gik stille, uden at nogen hørte det." },
];

export const COMMA_RULES_EN: CommaRule[] = [
  { title: "Lists", explanation: "Use commas to separate three or more items in a list.", example: "We bought apples, pears and bananas." },
  { title: "Independent clauses", explanation: "Use a comma before a coordinating conjunction when it joins two complete clauses.", example: "I read the task, and you write the answer." },
  { title: "Introductory phrases", explanation: "Use a comma after an introductory word, phrase or clause.", example: "After lunch, we continued working." },
  { title: "Extra information", explanation: "Set off non-essential information with commas.", example: "The book, which is on the table, is mine." },
  { title: "Direct address", explanation: "Use a comma when speaking directly to someone.", example: "Freya, could you help me?" },
  { title: "Direct speech", explanation: "Use a comma to separate quoted speech from the reporting clause.", example: "‘I am coming now,’ he said." },
  { title: "Contrasts", explanation: "A comma can separate a clear contrast in a sentence.", example: "She was tired, but she continued." },
  { title: "Dates and places", explanation: "Use commas between parts of dates, places and addresses when needed.", example: "Copenhagen, Denmark, is the destination." },
];

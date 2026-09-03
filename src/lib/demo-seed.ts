// One-tap demo seeder (Prompt 9) — client-side so everything lands on the
// SIGNED-IN user's own account (platform seed tools attach to a placeholder id).
//
// Seeds 3 realistic documents (Danish history, English ocean science, and a
// dense unformatted legal paragraph for the before/after stage moment), one
// saved note per document, an active share link on Document 1, and a lookup
// history of 3 example words on Document 2. Fully idempotent: it checks for a
// sentinel title first, so re-running never duplicates content.

import { overskill } from "@/lib/auth";
import { createShareLink, DEFAULT_SHARE_SNAPSHOT } from "@/lib/share";

/** Marker on Document 1 so we can detect an existing seed and skip. */
const SEED_MARKER = "Livet i en dansk middelalderby";

const DOC1_DA = {
  title: SEED_MARKER,
  language: "da" as const,
  content_raw: `I middelalderen voksede de første rigtige byer frem i Danmark. Byerne lå ofte ved en å eller en kyst, så handelsskibe nemt kunne lægge til. Bag byens volde og porte boede købmænd, håndværkere og gejstlige tæt sammen i små bindingsværkshuse.

Om morgenen åbnede torvet. Bønder fra landet kom ind med korn, smør og levende dyr, og de byttede varerne til salt, jern og stof. Penge var sjældne, så meget handel foregik stadig som byttehandel.

Håndværkerne var organiseret i laug. Et laug bestemte, hvem der måtte arbejde som for eksempel smed eller skomager, og det sikrede en fast pris og en god kvalitet. Man kunne ikke bare selv begynde at sælge sko på torvet.

Kirken fyldte meget i hverdagen. Klokkerne ringede flere gange om dagen, og de fleste indbyggere kunne hverken læse eller skrive. Munke og præster var ofte de eneste, der kunne latin og passede på byens vigtige dokumenter.

Livet i byen var hårdt. Gaderne var smalle og mudrede, og sygdomme spredte sig hurtigt, når mange mennesker boede så tæt. Alligevel søgte flere og flere ind til byerne, fordi her var arbejde, marked og et fællesskab, man ikke kunne finde ude på landet.`,
};

const DOC2_EN = {
  title: "Why the Ocean Matters",
  language: "en" as const,
  content_raw: `The ocean covers more than seventy percent of our planet, yet we have explored only a tiny part of it. Beneath the waves lies a world that shapes the air we breathe and the weather we feel every day.

Tiny plants called phytoplankton drift near the sunlit surface. Like plants on land, they use sunlight to make food, and in doing so they produce a large share of the oxygen we breathe. In a real sense, every second or third breath you take comes from the sea.

The ocean also stores heat. Warm water travels in giant currents from the equator toward the poles, carrying energy across thousands of kilometres. These currents keep some coasts mild and others cool, and small changes in them can shift the climate of whole regions.

Life in the sea depends on this balance. Coral reefs, fish, whales, and countless creatures we have never named all rely on clean, healthy water. Protecting the ocean is not only about saving distant animals — it is about protecting ourselves.`,
};

const DOC3_LEGAL = {
  title: "Terms of Service — Section 4 (raw)",
  language: "en" as const,
  content_raw: `4. LIMITATION OF LIABILITY. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, AND TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS OR LICENSORS BE LIABLE TO ANY PARTY FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE OR EXEMPLARY DAMAGES WHATSOEVER (INCLUDING, WITHOUT LIMITATION, DAMAGES FOR LOSS OF PROFITS, LOSS OF GOODWILL, LOSS OF DATA, BUSINESS INTERRUPTION, OR ANY OTHER COMMERCIAL DAMAGES OR LOSSES) ARISING OUT OF OR RELATING TO THIS AGREEMENT OR THE USE OF OR INABILITY TO USE THE SERVICES, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE), EVEN IF THE COMPANY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES; AND THE AGGREGATE LIABILITY OF THE COMPANY ARISING OUT OF OR RELATING TO THIS AGREEMENT, WHETHER IN CONTRACT, TORT OR OTHERWISE, SHALL NOT EXCEED THE AMOUNTS ACTUALLY PAID BY YOU TO THE COMPANY DURING THE TWELVE (12) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, IT BEING EXPRESSLY UNDERSTOOD AND AGREED THAT IF NO SUCH AMOUNTS HAVE BEEN PAID, YOUR SOLE AND EXCLUSIVE REMEDY, AND THE COMPANY'S ENTIRE LIABILITY, SHALL BE LIMITED TO ONE HUNDRED DANISH KRONER (DKK 100).`,
};

export interface SeedResult {
  created: boolean;
  documents: number;
  notes: number;
  shareLinks: number;
  lookups: number;
}

/** True if the demo content already exists on this account. */
export async function isSeeded(): Promise<boolean> {
  try {
    const rows = await overskill.entities.document.filter({ title: SEED_MARKER });
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Seed the full demo set. Idempotent — returns { created: false } if the demo
 * documents already exist. Every step is best-effort so a single failure never
 * aborts the whole seed.
 */
export async function seedDemoContent(): Promise<SeedResult> {
  const result: SeedResult = {
    created: false,
    documents: 0,
    notes: 0,
    shareLinks: 0,
    lookups: 0,
  };

  if (await isSeeded()) return result;

  // 1. Documents
  const doc1 = await overskill.entities.document.create({ ...DOC1_DA, listened: false });
  const doc2 = await overskill.entities.document.create({ ...DOC2_EN, listened: true });
  const doc3 = await overskill.entities.document.create({ ...DOC3_LEGAL, listened: false });
  result.documents = 3;
  result.created = true;

  // 2. One saved note per document
  const notes: Array<{ document_id: string; content: string; anchor_text: string }> = [
    {
      document_id: doc1.id,
      content:
        "Vigtigt til prøven: byerne lå ved vand pga. handel, håndværkere var i laug, og kirken styrede skrift og dokumenter. Husk forskellen mellem byttehandel og penge.",
      anchor_text: "Penge var sjældne, så meget handel foregik stadig som byttehandel.",
    },
    {
      document_id: doc2.id,
      content:
        "Key idea for my essay: phytoplankton make a lot of our oxygen, and ocean currents move heat around the planet. The ocean is basically the planet's lungs and heater.",
      anchor_text: "every second or third breath you take comes from the sea.",
    },
    {
      document_id: doc3.id,
      content:
        "Plain-English version: even if something goes wrong, the most they'll ever owe me is what I paid in the last 12 months — and if I paid nothing, just 100 kr. Good example of why formatting matters.",
      anchor_text: "YOUR SOLE AND EXCLUSIVE REMEDY",
    },
  ];
  for (const n of notes) {
    try {
      await overskill.entities.note.create(n);
      result.notes += 1;
    } catch (err) {
      console.warn("[seed] note failed:", err);
    }
  }

  // 3. One active share link on Document 1
  try {
    await createShareLink({
      documentId: doc1.id,
      title: doc1.title,
      contentRaw: doc1.content_raw,
      language: doc1.language,
      snapshot: {
        ...DEFAULT_SHARE_SNAPSHOT,
        font: "opendyslexic",
        tint: "soft-blue",
        bionic: true,
        fontSize: 20,
      },
      sharerPremium: true,
    });
    result.shareLinks = 1;
  } catch (err) {
    console.warn("[seed] share link failed:", err);
  }

  // 4. Lookup history — 3 example words on Document 2 (pre-filled, zero AI cost)
  const userId = await currentUserId();
  const lookups = [
    {
      source_text: "phytoplankton",
      source_lang: "en",
      target_lang: "en",
      kind: "explain",
      result_text:
        "Tiny ocean plants, far too small to see on their own. They float near the surface and use sunlight to make food, giving off oxygen — just like plants on land.",
    },
    {
      source_text: "currents",
      source_lang: "en",
      target_lang: "en",
      kind: "explain",
      result_text:
        "Rivers of water that move inside the ocean. They carry warm or cool water across long distances and help set the weather along the coasts they pass.",
    },
    {
      source_text: "equator",
      source_lang: "en",
      target_lang: "da",
      kind: "translate",
      result_text: "ækvator",
    },
  ];
  if (userId) {
    for (const l of lookups) {
      try {
        await overskill.entities.lookup.create({
          document_id: doc2.id,
          looked_up_by: userId,
          ...l,
        });
        result.lookups += 1;
      } catch (err) {
        console.warn("[seed] lookup failed:", err);
      }
    }
  }

  return result;
}

async function currentUserId(): Promise<string | null> {
  try {
    const me = await overskill.auth.me();
    return me?.id || null;
  } catch {
    return null;
  }
}

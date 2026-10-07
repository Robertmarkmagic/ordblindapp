import { fetchFunction } from "@/lib/supabase";
import { normalizePublicWebUrl, parseWebPageText, WebImportError, type WebPageText } from "../../supabase/functions/_shared/web-source";

export { normalizePublicWebUrl, safeWebSourceUrl, WebImportError } from "../../supabase/functions/_shared/web-source";
export type { WebPageText } from "../../supabase/functions/_shared/web-source";

export async function importWebPage(address: string, signal?: AbortSignal): Promise<WebPageText> {
  const url = normalizePublicWebUrl(address);
  let response: Response;
  try {
    response = await fetchFunction("web-import", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }), signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new WebImportError(error instanceof Error && error.message === "not_authenticated" ? "not_authenticated" : "web_unavailable");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new WebImportError(body?.error || (response.status === 401 ? "not_authenticated" : "web_unavailable"));
  // Validate the response again before a page can become a saved reading.
  return parseWebPageText({ data: { title: body?.title, text: body?.text, url: body?.sourceUrl } }, url);
}

export function webImportMessage(code: string, language: "da" | "en"): string {
  const messages: Record<string, [string, string]> = {
    invalid_url: ["Indsæt en offentlig webadresse, for eksempel https://www.wattpad.com/123-kapitel. Brug ikke et link med loginoplysninger.", "Enter a public web address, such as https://www.wattpad.com/123-chapter. Do not use a link containing login credentials."],
    chapter_link_required: ["Åbn det kapitel, du vil læse på Wattpad, og kopier kapitlets webadresse. Et link til bogens forside indeholder ikke selve kapitlet.", "Open the chapter you want to read on Wattpad and copy its web address. A story's cover page does not contain the chapter text."],
    page_blocked: ["Siden udleverer ikke teksten. Den kan kræve login, betaling eller blokere teksthentning. Åbn siden og kopier den tekst, du kan læse, til Indsæt tekst.", "The page is not providing its text. It may require a login or payment, or block text extraction. Open it and copy text you can read into Paste text."],
    no_readable_text: ["Vi fandt ikke nok læsetekst på siden. Brug et link direkte til artiklen eller kapitlet, eller indsæt teksten selv.", "We could not find enough reading text. Use a direct article or chapter link, or paste the text yourself."],
    page_too_long: ["Teksten er for lang til én læsning. Vælg et kapitel eller indsæt et kortere afsnit.", "This text is too long for one reading. Choose a chapter or paste a shorter passage."],
    rate_limited: ["Der bliver hentet mange sider lige nu. Vent et øjeblik og prøv igen. Du kan også indsætte teksten selv.", "Many pages are being fetched right now. Wait a moment and try again, or paste the text yourself."],
    web_timeout: ["Siden tog for lang tid at svare. Prøv igen, eller åbn siden og kopier teksten.", "The page took too long to respond. Try again, or open it and copy the text."],
    not_authenticated: ["Log ind igen for at hente teksten fra linket. Webadressen bliver i feltet.", "Sign in again to fetch the page. Your web address stays in the field."],
    web_unavailable: ["Vi kunne ikke hente hjemmesiden lige nu. Prøv igen, eller åbn siden og indsæt teksten selv.", "We could not fetch the page just now. Try again, or open it and paste the text yourself."],
  };
  return (messages[code] || messages.web_unavailable)[language === "da" ? 0 : 1];
}

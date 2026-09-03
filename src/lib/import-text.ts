// Client-side text extraction for the New Reading Session "Upload file" tab.
//
// Accepts .txt and .pdf. For PDFs we extract selectable text with pdf.js. If a
// PDF is a scanned image (no extractable text), we DON'T fail silently — the
// caller shows a kind message and steers the user to pasting instead.
//
// pdf.js (~1.5MB) is HEAVY, so it is dynamic-imported INSIDE the function —
// never at the top level — to keep the Worker bundle under Cloudflare's asset
// cap and avoid loading it unless a PDF is actually opened.

export type ImportKind = "txt" | "pdf";

export interface ImportResult {
  text: string;
  kind: ImportKind;
  /** True for a PDF that had no extractable text (scanned image). */
  scanned: boolean;
}

export function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "text/plain" ||
    file.type === "application/pdf" ||
    name.endsWith(".txt") ||
    name.endsWith(".pdf")
  );
}

async function extractTxt(file: File): Promise<string> {
  const raw = await file.text();
  // Normalize newlines; keep paragraph breaks (blank lines) intact.
  return raw.replace(/\r\n?/g, "\n").trim();
}

// Pull the selectable text out of a loaded pdf.js document.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readPdfText(doc: any): Promise<string> {
  const paragraphs: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    // Rebuild lines: pdf.js marks end-of-line items with `hasEOL`.
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as Array<{ str: string; hasEOL?: boolean }>) {
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line.trim()) lines.push(line);
    const pageText = lines.join("\n").trim();
    if (pageText) paragraphs.push(pageText);
  }
  try {
    await doc.destroy();
  } catch {
    /* ignore */
  }
  return paragraphs.join("\n\n").trim();
}

async function extractPdf(file: File): Promise<{ text: string; scanned: boolean }> {
  // Dynamic import — keeps pdf.js (~1.5MB) out of the main/Worker bundle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import("pdfjs-dist");
  const buffer = await file.arrayBuffer();

  // Hardening for the browser sandbox: no worker-side fetch, no eval.
  const baseOptions = {
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  } as const;

  // PRIMARY: serve the worker from OUR OWN bundle so its version ALWAYS matches
  // the installed API version. Vite emits it as an asset via the `?url` import.
  // Loading the worker from a CDN pinned to `version` is the #1 cause of PDF
  // failures — with `pdfjs-dist@latest` that exact patch is often missing from
  // the CDN → 404 → "fake worker" setup fails → getDocument throws.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workerMod: any = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
    const doc = await pdfjs.getDocument({ data: buffer.slice(0), ...baseOptions }).promise;
    const text = await readPdfText(doc);
    return { text, scanned: text.replace(/\s/g, "").length < 20 };
  } catch (workerErr) {
    // FALLBACK: run pdf.js on the main thread (no worker). Slower for big PDFs
    // but bulletproof when the worker asset can't load in the deployed sandbox.
    console.warn("[import-text] PDF worker path failed, retrying on main thread:", workerErr);
    const doc = await pdfjs.getDocument({
      data: buffer.slice(0),
      disableWorker: true,
      ...baseOptions,
    }).promise;
    const text = await readPdfText(doc);
    return { text, scanned: text.replace(/\s/g, "").length < 20 };
  }
}

/**
 * Extract text from an uploaded .txt or .pdf. Rejects unsupported types with a
 * friendly message. For scanned PDFs returns `scanned: true` and empty text so
 * the caller can show the "try pasting instead" notice — never throws for that.
 */
export async function extractTextFromFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isTxt = file.type === "text/plain" || name.endsWith(".txt");

  if (isTxt) {
    return { text: await extractTxt(file), kind: "txt", scanned: false };
  }
  if (isPdf) {
    const { text, scanned } = await extractPdf(file);
    return { text, kind: "pdf", scanned };
  }
  throw new Error("That file type isn't supported yet. Please upload a .txt or .pdf.");
}

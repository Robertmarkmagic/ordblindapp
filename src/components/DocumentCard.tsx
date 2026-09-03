import React from "react";
import { Link } from "react-router-dom";
import { Clock, Headphones, Link2 } from "lucide-react";
import { firstWords, estimateReadingMinutes, formatShortDate } from "@/lib/text-utils";

export interface DocumentRecord {
  id: string;
  title: string;
  content_raw?: string;
  language?: string;
  listened?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * A calm, paper-like card for a saved document. Whole card is a single link
 * (44px+ target) with a clear focus ring. No red anywhere. When the document
 * has at least one active share link, a small sage link badge appears so the
 * reader can see at a glance which readings are shared.
 */
export function DocumentCard({ doc, shared = false }: { doc: DocumentRecord; shared?: boolean }) {
  const preview = firstWords(doc.content_raw, 15);
  const minutes = estimateReadingMinutes(doc.content_raw);

  return (
    <Link
      to={`/read/${doc.id}`}
      aria-label={`Open "${doc.title}"${shared ? " (shared)" : ""}`}
      className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left shadow-paper outline-none transition duration-200 hover:-translate-y-0.5 hover:border-sage/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground">
            {doc.title || "Untitled reading"}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {shared && (
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-sage/15 text-sage"
                aria-label="This reading is shared"
                title="Shared — a public link is active"
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            {doc.listened && (
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground"
                aria-label="You've listened to this"
                title="You've listened to this"
              >
                <Headphones className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
        {preview ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {preview}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No text yet.</p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {minutes > 0 ? `${minutes} min read` : "Empty"}
        </span>
        {doc.created_at && <span>{formatShortDate(doc.created_at)}</span>}
        {shared && <span className="text-sage">Shared</span>}
      </div>
    </Link>
  );
}

export default DocumentCard;

import React, { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Copy, Check, QrCode, Trash2, Loader2, Eye, Share2, Plus, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import { FREE_ACTIVE_SHARE_LINKS } from "@/lib/billing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  createShareLink,
  listShareLinksForDocument,
  revokeShareLink,
  publicShareUrl,
  type ShareLinkRow,
  type ShareSnapshot,
} from "@/lib/share";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  title: string;
  contentRaw: string;
  language: string;
  /** The CURRENT formatting in the reader — snapshotted into new share links. */
  snapshot: ShareSnapshot;
  sharerPremium: boolean;
}

/**
 * Share formatted view — the growth loop. Snapshots the reader's current
 * formatting into a read-only public link, with a copy button (+ confirmation),
 * a QR code for handing out in class, and the share manager (active links with
 * view counts + a calm revoke). No red — revoking is a quiet, reversible act.
 */
export function ShareDialog({
  open,
  onOpenChange,
  documentId,
  title,
  contentRaw,
  language,
  snapshot,
  sharerPremium,
}: ShareDialogProps) {
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [qrSlug, setQrSlug] = useState<string | null>(null);
  const { premium } = usePremium();
  const navigate = useNavigate();
  const atShareLimit = !premium && links.length >= FREE_ACTIVE_SHARE_LINKS;

  const refresh = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      setLinks(await listShareLinksForDocument(documentId));
    } catch (err) {
      console.warn("[share] load links failed:", err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const handleCreate = useCallback(async () => {
    if (atShareLimit) return;
    setCreating(true);
    try {
      const created = await createShareLink({
        documentId,
        title,
        contentRaw,
        language,
        snapshot,
        sharerPremium,
      });
      setLinks((prev) => [created, ...prev]);
      setQrSlug(created.public_slug);
      // Auto-copy the fresh link so the sharer can paste it straight away.
      try {
        await navigator.clipboard.writeText(publicShareUrl(created.public_slug));
        setCopiedSlug(created.public_slug);
        setTimeout(() => setCopiedSlug(null), 2500);
        toast("Share link ready — copied to your clipboard.", {
          description: "Anyone with this link can read it, in your formatting. No login needed.",
        });
      } catch {
        toast("Share link ready.", { description: "Tap Copy to grab the link." });
      }
    } catch (err) {
      console.error("[share] create failed:", err);
      toast("We couldn't create the link just now.", {
        description: "Take a breath and try again in a moment.",
      });
    } finally {
      setCreating(false);
    }
  }, [documentId, title, contentRaw, language, snapshot, sharerPremium, atShareLimit]);

  const handleCopy = useCallback(async (slug: string) => {
    try {
      await navigator.clipboard.writeText(publicShareUrl(slug));
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2500);
      toast("Link copied.");
    } catch {
      toast("Couldn't copy automatically — select the link and copy it.");
    }
  }, []);

  const handleRevoke = useCallback(async (id: string, slug: string) => {
    try {
      await revokeShareLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      if (qrSlug === slug) setQrSlug(null);
      toast("Link revoked.", { description: "It no longer opens for anyone." });
    } catch (err) {
      console.error("[share] revoke failed:", err);
      toast("We couldn't revoke that just now. Try again in a moment.");
    }
  }, [qrSlug]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Share2 className="h-6 w-6 text-sage" aria-hidden="true" />
            Share formatted view
          </DialogTitle>
          <DialogDescription>
            Hand this reading to a student, parent or class — they get your exact
            formatting and can listen along, no login required.
          </DialogDescription>
        </DialogHeader>

        {/* Create a fresh link */}
        <Button
          onClick={handleCreate}
          disabled={creating || !contentRaw || atShareLimit}
          className="h-12 w-full rounded-full bg-sage text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90 disabled:opacity-60"
        >
          {creating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
              Creating link…
            </>
          ) : (
            <>
              <Plus className="mr-1 h-5 w-5" aria-hidden="true" />
              {links.length ? "Create another link" : "Create share link"}
            </>
          )}
        </Button>

        {atShareLimit && (
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="mt-1 flex w-full items-start gap-2.5 rounded-2xl border border-sage/25 bg-accent/50 p-3.5 text-left outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
            <span className="text-sm text-foreground">
              Free includes one active share link. <span className="font-semibold text-sage">Go Premium</span> for unlimited links — or revoke this one to share something new.
            </span>
          </button>
        )}

        {/* Active links / manager */}
        <div className="mt-2 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rr-skeleton h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
              <Link2 className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                No active links yet. Create one to start sharing.
              </p>
            </div>
          ) : (
            links.map((link) => {
              const url = publicShareUrl(link.public_slug);
              const showQr = qrSlug === link.public_slug;
              const copied = copiedSlug === link.public_slug;
              return (
                <div
                  key={link.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-paper"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm text-foreground">{url}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="tabular-nums">{Number(link.view_count) || 0}</span>{" "}
                        {(Number(link.view_count) || 0) === 1 ? "view" : "views"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => handleCopy(link.public_slug)}
                      className="h-10 gap-1.5 rounded-full bg-sage px-4 text-sm font-semibold text-sage-foreground hover:bg-sage/90"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" aria-hidden="true" /> Copy link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setQrSlug(showQr ? null : link.public_slug)}
                      className="h-10 gap-1.5 rounded-full border border-border bg-transparent px-4 text-sm font-medium text-foreground hover:bg-accent"
                      aria-pressed={showQr}
                    >
                      <QrCode className="h-4 w-4 text-sage" aria-hidden="true" />
                      {showQr ? "Hide QR" : "QR code"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleRevoke(link.id, link.public_slug)}
                      className="ml-auto h-10 gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground hover:bg-amber/10 hover:text-foreground"
                      aria-label="Revoke this link"
                    >
                      <Trash2 className="h-4 w-4 text-amber" aria-hidden="true" />
                      Revoke
                    </Button>
                  </div>

                  {showQr && (
                    <div className="rr-fade-up mt-4 flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-4">
                      <QRCodeSVG value={url} size={168} bgColor="transparent" fgColor="#3F5B4C" />
                      <p className="text-xs text-muted-foreground">
                        Point a phone camera here to open the reading.
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;

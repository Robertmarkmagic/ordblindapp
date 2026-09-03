import React from "react";
import { Sparkles } from "lucide-react";

interface UpgradeInviteProps {
  heading: string;
  message: string;
  /** Primary (warm) action — usually "See Premium". */
  primaryLabel: string;
  onPrimary: () => void;
  /** Optional equal-weight secondary — e.g. "Back to my space". */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Small reassuring line under the buttons (e.g. reset date). */
  footnote?: string;
  className?: string;
}

/**
 * UpgradeInvite — the shared, warm full-state used wherever a free limit is
 * reached. Deliberately NOT a wall: sage primary and ghost secondary carry
 * EQUAL visual weight so "come back on the 1st" never feels like the wrong
 * choice. No red, no countdown pressure.
 */
export function UpgradeInvite({
  heading,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  footnote,
  className = "",
}: UpgradeInviteProps) {
  return (
    <div
      className={`rr-fade-up mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-border bg-card px-8 py-12 text-center shadow-paper ${className}`}
    >
      <span
        className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-sage"
        aria-hidden="true"
      >
        <Sparkles className="h-7 w-7" />
      </span>
      <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">{heading}</h2>
      <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">{message}</p>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onPrimary}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-7 text-base font-semibold text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {secondaryLabel}
          </button>
        )}
      </div>

      {footnote && <p className="mt-5 text-sm text-muted-foreground">{footnote}</p>}
    </div>
  );
}

export default UpgradeInvite;

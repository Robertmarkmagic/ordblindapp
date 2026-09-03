import React from "react";
import { Info } from "lucide-react";

/**
 * A gentle inline notice. Used instead of red error banners — errors here are
 * amber and phrased warmly. There is never a red error state in ReliefRead.
 */
export function SoftNotice({
  children,
  icon,
  className = "",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm leading-relaxed text-foreground ${className}`}
    >
      <span className="mt-0.5 text-amber" aria-hidden="true">
        {icon ?? <Info className="h-4 w-4" />}
      </span>
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}

export default SoftNotice;

import React from "react";

/** A single calm skeleton card matching DocumentCard's shape. */
export function DocumentCardSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-paper">
      <div className="space-y-3">
        <div className="rr-skeleton h-5 w-3/4 rounded-lg" />
        <div className="space-y-2">
          <div className="rr-skeleton h-3 w-full rounded" />
          <div className="rr-skeleton h-3 w-11/12 rounded" />
          <div className="rr-skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <div className="rr-skeleton h-3 w-20 rounded" />
        <div className="rr-skeleton h-3 w-16 rounded" />
      </div>
    </div>
  );
}

/** A grid of skeleton cards for the dashboard loading state. */
export function DocumentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <DocumentCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Generic setting-row skeleton for the settings page loading state. */
export function SettingRowSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rr-skeleton h-4 w-40 rounded" />
      <div className="rr-skeleton h-12 w-full rounded-xl" />
    </div>
  );
}

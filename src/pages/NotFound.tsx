import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Custom 404 — calm, on-brand, never alarming. A soft sage book mark, a warm
 * message, and two clear ways back. Still reports the missing route to the
 * editor when running inside the Overskill preview iframe.
 */
export default function NotFound() {
  const location = useLocation();
  usePageTitle("Page not found");

  useEffect(() => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      try {
        window.parent.postMessage(
          {
            type: "route_not_found",
            source: "overskill-app",
            data: {
              path: location.pathname,
              fullUrl: window.location.href,
              search: location.search,
              timestamp: new Date().toISOString(),
            },
          },
          "*"
        );
      } catch (e) {
        console.error("[NotFound] Failed to report to parent:", e);
      }
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Soft calm glow at the top, matching the rest of the app */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-gradient-calm"
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        <div className="rr-fade-up flex flex-col items-center">
          <div className="relative grid h-24 w-24 place-items-center" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-accent" />
            <div className="absolute inset-3 rounded-full bg-highlight/50" />
            <BookOpen className="relative h-11 w-11 text-sage" />
          </div>

          <p className="mt-7 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Page not found
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            This page wandered off
          </h1>
          <p className="mt-3 max-w-sm leading-relaxed text-muted-foreground">
            The page you're looking for isn't here — but your reading space is
            just a tap away.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex h-12 items-center gap-1.5 rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper outline-none transition hover:bg-sage/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Back to home
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-base font-medium text-foreground shadow-paper outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              My reading space
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

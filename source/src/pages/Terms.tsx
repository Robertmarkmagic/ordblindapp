import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function Terms() {
  useEffect(() => {
    document.title = "Terms · ReliefRead";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-calm" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-2xl px-5 pb-24 pt-8 sm:px-8">
        <Link
          to="/"
          className="mb-8 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back home
        </Link>

        <article>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Terms</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Plain terms for a tool meant to make life easier, not harder.
          </p>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">Using ReliefRead</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            ReliefRead helps you read and write more comfortably. It is a reading aid, not medical,
            legal or educational advice, and it does not replace professional support.
          </p>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">Your content</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            You keep ownership of everything you paste in and write. Please only add text you have
            the right to use, and be thoughtful about what you make public with a share link.
          </p>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">Fair use &amp; cancelling</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            The free plan includes a monthly amount of reading and the standard voice. Premium is
            billed monthly or yearly and you can cancel anytime — no dark patterns, no guilt.
          </p>

          <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 text-sage" aria-hidden="true" />
            Proudly built in Denmark.
          </p>
        </article>
      </main>
    </div>
  );
}

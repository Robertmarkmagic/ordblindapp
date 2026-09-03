import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy · ReliefRead";
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

        <article className="prose-relief">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Privacy</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            ReliefRead is built for readers who are often let down by the systems around them, so
            respecting your privacy is not an afterthought — it is the whole point.
          </p>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">What we store</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Only what you create: the texts you paste in to read, your reading preferences (font,
            tint, spacing, voice) and any notes you write. Your readings are private to your account
            unless you choose to share one with a public link.
          </p>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">What we never do</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            We never sell your data, and we never require a medical diagnosis to use the app. Your
            reading is yours.
          </p>

          <h2 className="mt-8 font-display text-xl font-semibold text-foreground">Deleting your data</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            You can delete any reading, note or share link at any time from your account. Ask us and
            we will remove everything.
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

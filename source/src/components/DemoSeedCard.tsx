import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { isSeeded, seedDemoContent } from "@/lib/demo-seed";

/**
 * A calm, dismissible card that seeds realistic demo content onto the
 * signed-in user's own account with one tap. Auto-hides once the account is
 * already seeded, so it never nags. Best-effort — failures show a soft toast,
 * never a red error.
 */
export function DemoSeedCard({ onSeeded }: { onSeeded?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    isSeeded().then((seeded) => {
      if (active) setVisible(!seeded);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDemoContent();
      if (res.created) {
        setDone(true);
        toast("Demo content ready 🌿", {
          description: `${res.documents} readings, ${res.notes} notes, a share link and a lookup history are on your account.`,
        });
        onSeeded?.();
        setTimeout(() => setVisible(false), 1400);
      } else {
        toast("Demo content is already loaded.", {
          description: "Your example readings are in the list below.",
        });
        setVisible(false);
      }
    } catch (err) {
      console.warn("[demo] seed failed:", err);
      toast("We couldn't load the demo just now.", {
        description: "Take a breath and try once more.",
      });
    } finally {
      setSeeding(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="rr-fade-up mb-8 flex flex-col gap-4 rounded-3xl border border-sage/30 bg-accent/50 p-5 shadow-paper sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sage text-sage-foreground">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            Load example readings
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Add three sample texts (Danish, English, and a messy legal
            paragraph) with notes and a shared link — perfect for a quick tour.
          </p>
        </div>
      </div>
      <Button
        onClick={handleSeed}
        disabled={seeding || done}
        className="h-11 shrink-0 rounded-full bg-sage px-5 text-sm font-semibold text-sage-foreground shadow-paper hover:bg-sage/90 disabled:opacity-70"
      >
        {done ? (
          <>
            <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Added
          </>
        ) : seeding ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </>
        ) : (
          "Load demo content"
        )}
      </Button>
    </div>
  );
}

export default DemoSeedCard;

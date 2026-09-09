import { useEffect, useState } from "react";
import { Loader2, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Profile = {
  display_name: string;
  purpose: string;
  help_needs: string;
  locale: "da" | "en";
};

const EMPTY_PROFILE: Profile = {
  display_name: "",
  purpose: "other",
  help_needs: "",
  locale: "da",
};

export function ProfileSettings() {
  const { user, refresh } = useAuth();
  const { language } = useLanguage();
  const da = language === "da";
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("profiles")
      .select("display_name,purpose,help_needs,locale")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast(da ? "Profilen kunne ikke hentes." : "We could not load your profile.");
        } else if (data) {
          setProfile({
            display_name: data.display_name || "",
            purpose: data.purpose || "other",
            help_needs: data.help_needs || "",
            locale: data.locale === "en" ? "en" : "da",
          });
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, da]);

  const saveProfile = async () => {
    if (!user || !profile.display_name.trim()) return;
    setSaving(true);
    const payload = {
      display_name: profile.display_name.trim(),
      purpose: profile.purpose,
      help_needs: profile.help_needs.trim() || null,
      locale: profile.locale,
      onboarding_completed: true,
    };
    const [{ error: profileError }, { error: metadataError }] = await Promise.all([
      supabase.from("profiles").update(payload).eq("user_id", user.id),
      supabase.auth.updateUser({
        data: {
          full_name: payload.display_name,
          purpose: payload.purpose,
          help_needs: payload.help_needs,
          locale: payload.locale,
          onboarding_completed: true,
        },
      }),
    ]);
    setSaving(false);
    if (profileError || metadataError) {
      toast(da ? "Profilen kunne ikke gemmes. Prøv igen." : "We could not save your profile. Try again.");
      return;
    }
    await refresh();
    toast(da ? "Din profil er gemt." : "Your profile is saved.");
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-card p-6 shadow-paper">
        <Loader2 className="h-6 w-6 animate-spin text-sage" aria-label={da ? "Henter profil" : "Loading profile"} />
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-paper">
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-sage" aria-hidden="true" />
        <h2 className="font-display text-xl font-semibold text-foreground">
          {da ? "Min profil" : "My profile"}
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {da ? "Du kan altid ændre det senere." : "You can change this at any time."}
      </p>

      <div className="mt-5 grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="profile-name">{da ? "Navn" : "Name"}</Label>
          <Input
            id="profile-name"
            autoComplete="name"
            value={profile.display_name}
            onChange={(event) => setProfile({ ...profile, display_name: event.target.value })}
            className="h-12 rounded-xl text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input id="profile-email" value={user?.email || ""} disabled className="h-12 rounded-xl text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-purpose">
            {da ? "Hvad skal du bruge ReliefRead til?" : "What will you use ReliefRead for?"}
          </Label>
          <Select value={profile.purpose} onValueChange={(purpose) => setProfile({ ...profile, purpose })}>
            <SelectTrigger id="profile-purpose" className="h-12 rounded-xl text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="work">{da ? "Arbejde" : "Work"}</SelectItem>
              <SelectItem value="education">{da ? "Skole eller uddannelse" : "School or education"}</SelectItem>
              <SelectItem value="personal">{da ? "Privat brug" : "Personal use"}</SelectItem>
              <SelectItem value="child">{da ? "Hjælp til et barn" : "Helping a child"}</SelectItem>
              <SelectItem value="other">{da ? "Andet" : "Other"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-help">{da ? "Hvad vil du især have hjælp til?" : "What would you especially like help with?"}</Label>
          <Textarea
            id="profile-help"
            value={profile.help_needs}
            onChange={(event) => setProfile({ ...profile, help_needs: event.target.value })}
            className="min-h-24 rounded-xl text-base"
          />
        </div>
        <Button
          type="button"
          onClick={saveProfile}
          disabled={saving || !profile.display_name.trim()}
          className="h-12 justify-self-start rounded-full bg-sage px-6 font-semibold text-sage-foreground"
        >
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          {da ? "Gem profil" : "Save profile"}
        </Button>
      </div>
    </section>
  );
}

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, Gift, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";
import { usePageTitle } from "@/hooks/usePageTitle";

const CONTACT_EMAIL = "hello@reliefread.com";

export default function TrialSignup() {
  const { language, t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  usePageTitle(t("trial.title", "Try ReliefRead free"));

  const purposeLabels = useMemo(
    () => ({
      work: t("trial.work", "Work"),
      education: t("trial.education", "School or education"),
      personal: t("trial.personal", "Personal use"),
      child: t("trial.child", "Helping a child"),
      other: t("trial.other", "Other"),
    }),
    [t]
  );

  const requestText = useMemo(() => {
    const subject = language === "da"
      ? "Tilmelding til gratis prøveperiode hos ReliefRead"
      : "ReliefRead free trial signup";
    const body = language === "da"
      ? [
          "Hej ReliefRead",
          "",
          "Jeg vil gerne tilmeldes en gratis prøveperiode.",
          "",
          `Navn: ${name}`,
          `E-mail: ${email}`,
          `ReliefRead skal bruges til: ${purposeLabels[purpose as keyof typeof purposeLabels] || purpose}`,
          `Jeg vil især gerne have hjælp til: ${message.trim() || "Ikke angivet"}`,
          "",
          "Jeg accepterer, at ReliefRead kontakter mig om prøveadgangen.",
        ].join("\n")
      : [
          "Hello ReliefRead",
          "",
          "I would like to join the free trial.",
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `ReliefRead will be used for: ${purposeLabels[purpose as keyof typeof purposeLabels] || purpose}`,
          `I would especially like help with: ${message.trim() || "Not specified"}`,
          "",
          "I agree that ReliefRead may contact me about trial access.",
        ].join("\n");

    return { subject, body };
  }, [email, language, message, name, purpose, purposeLabels]);

  const mailto = useMemo(
    () => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(requestText.subject)}&body=${encodeURIComponent(requestText.body)}`,
    [requestText]
  );

  const openMail = () => {
    window.location.href = mailto;
    setSubmitted(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !purpose || !consent) return;
    openMail();
  };

  const copyRequest = async () => {
    await navigator.clipboard.writeText(`${requestText.subject}\n\n${requestText.body}`);
    setCopied(true);
  };

  const benefits = [
    t("trial.benefit1", "Try the reading and writing help at your own pace"),
    t("trial.benefit2", "Help us make ReliefRead even better"),
    t("trial.benefit3", "No payment during the trial"),
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-calm" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-full pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("header.home", "ReliefRead home")}
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sage text-sage-foreground shadow-paper">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">ReliefRead</span>
        </Link>
        <LanguageSwitcher compact />
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-4 sm:px-8 sm:pt-8">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("trial.back", "Back to the front page")}
        </Link>

        <div className="mt-5 grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <section className="pt-3 lg:sticky lg:top-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-primary shadow-paper">
              <Gift className="h-4 w-4" aria-hidden="true" />
              {t("trial.badge", "Free trial access")}
            </span>
            <h1 className="mt-6 max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {t("trial.title", "Try ReliefRead free")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t("trial.intro", "Join the trial. You do not need a payment card, password or dyslexia diagnosis.")}
            </p>
            <ul className="mt-8 space-y-4">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-base leading-relaxed text-foreground">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-primary">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-paper sm:p-9">
            {submitted ? (
              <div className="py-4 text-center sm:py-8">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-primary">
                  <Mail className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-6 font-display text-3xl font-semibold text-foreground">
                  {t("trial.sentTitle", "Your signup is ready")}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                  {t("trial.sentText", "Your email app has opened with your details. Send the email to complete your signup.")}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button onClick={openMail} className="h-12 rounded-full bg-sage px-6 font-semibold text-sage-foreground hover:bg-sage/90">
                    <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("trial.openMail", "Open the email again")}
                  </Button>
                  <Button variant="outline" onClick={copyRequest} className="h-12 rounded-full px-6 font-semibold">
                    {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
                    {copied ? t("trial.copied", "Signup copied") : t("trial.copy", "Copy signup")}
                  </Button>
                </div>
                <Link to="/" className="mt-7 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {t("trial.back", "Back to the front page")}
                </Link>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                  {t("trial.formTitle", "Sign up here")}
                </h2>
                <form onSubmit={handleSubmit} className="mt-7 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="trial-name" className="text-base">{t("trial.name", "Name")}</Label>
                    <Input
                      id="trial-name"
                      name="name"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t("trial.namePlaceholder", "Your name")}
                      className="h-12 rounded-xl text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-email" className="text-base">{t("trial.email", "Email")}</Label>
                    <Input
                      id="trial-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t("trial.emailPlaceholder", "you@example.com")}
                      className="h-12 rounded-xl text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-purpose" className="text-base">{t("trial.purpose", "What will you use ReliefRead for?")}</Label>
                    <Select value={purpose} onValueChange={setPurpose} required>
                      <SelectTrigger id="trial-purpose" className="h-12 rounded-xl text-base">
                        <SelectValue placeholder={t("trial.purposePlaceholder", "Choose an option")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(purposeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="min-h-11 text-base">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <Label htmlFor="trial-message" className="text-base">{t("trial.message", "What would you especially like help with?")}</Label>
                      <span className="text-sm text-muted-foreground">{t("trial.messageOptional", "You can always change this later")}</span>
                    </div>
                    <Textarea
                      id="trial-message"
                      name="message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder={t("trial.messagePlaceholder", "For example reading aloud, writing or easier text")}
                      className="min-h-28 rounded-xl text-base"
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
                    <Checkbox
                      id="trial-consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                      required
                      className="mt-1 h-5 w-5"
                    />
                    <Label htmlFor="trial-consent" className="cursor-pointer text-sm font-normal leading-relaxed text-foreground">
                      {t("trial.consent", "ReliefRead may contact me about my trial access.")}
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={!name.trim() || !email.trim() || !purpose || !consent}
                    className="h-12 w-full rounded-full bg-sage px-7 text-base font-semibold text-sage-foreground shadow-paper hover:bg-sage/90"
                  >
                    {t("trial.submit", "Join the free trial")}
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("trial.mailNote", "When you continue, your email opens with the signup ready. Send the email and we will contact you about trial access.")}
                  </p>
                </form>
              </>
            )}
          </section>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          <a href={`mailto:${CONTACT_EMAIL}`} className="rounded underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("trial.contact", "Questions? Write to hello@reliefread.com")}
          </a>
        </p>
      </main>
    </div>
  );
}

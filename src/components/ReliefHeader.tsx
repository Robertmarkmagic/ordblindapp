import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { firstNameFrom } from "@/lib/text-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n";

/**
 * Calm app header used on all signed-in pages.
 * Provides the three required auth affordances: current user, a link to
 * /settings, and a logout action. Every control is >=44px and has an aria-label.
 */
export function ReliefHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const displayName = user?.name || user?.email || "";
  const initial =
    (user?.name?.[0] || user?.email?.[0] || "R").toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/logged-out");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          to="/dashboard"
          aria-label={t("header.home", "ReliefRead home")}
          className="flex items-center gap-3 rounded-2xl px-1 py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            data-app-icon
            className="grid h-11 w-11 place-items-center rounded-2xl bg-sage text-sage-foreground shadow-paper"
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              ReliefRead
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {t("header.tagline", "Your reading space")}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher compact />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("header.account", "Account menu")}
            className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-2 pr-3 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl ?? user?.image ?? undefined} alt="" />
              <AvatarFallback className="bg-sage text-sage-foreground text-sm font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground sm:block">
              {firstNameFrom(user?.name, user?.email || "You")}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-2xl">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {displayName ? displayName : t("header.signedIn", "Signed in")}
              </span>
              {user?.email && displayName !== user.email && (
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-[44px] cursor-pointer gap-2 rounded-xl"
              onSelect={() => navigate("/settings")}
            >
              <SettingsIcon className="h-4 w-4" aria-hidden="true" />
              {t("header.settings", "Reading settings")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-[44px] cursor-pointer gap-2 rounded-xl"
              onSelect={handleLogout}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("header.signOut", "Sign out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default ReliefHeader;

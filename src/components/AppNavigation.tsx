import { BookOpen, House, NotebookText, PenLine } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";

const items = [
  { to: "/dashboard", key: "appNav.home", english: "Home", icon: House },
  { to: "/new", key: "appNav.read", english: "Read", icon: BookOpen },
  { to: "/write", key: "appNav.write", english: "Write", icon: PenLine },
  { to: "/notes", key: "appNav.notes", english: "Notes", icon: NotebookText },
];

function isActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === "/dashboard";
  if (to === "/new") return pathname === "/new" || pathname.startsWith("/read/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppNavigation() {
  const { pathname } = useLocation();
  const { t } = useLanguage();

  const links = items.map(({ to, key, english, icon: Icon }) => {
    const active = isActive(pathname, to);
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? "page" : undefined}
        className={`group flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
          active
            ? "bg-accent text-primary"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        <span>{t(key, english)}</span>
      </Link>
    );
  });

  return (
    <>
      <nav className="hidden items-center gap-1 rounded-[1.25rem] border border-border/70 bg-card/75 p-1 shadow-paper md:flex" aria-label={t("appNav.label", "Main navigation")}>
        {links}
      </nav>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-[1.6rem] border border-border/80 bg-card/95 p-1.5 shadow-[0_16px_50px_-18px_hsl(var(--foreground)/0.35)] backdrop-blur-xl md:hidden"
        aria-label={t("appNav.label", "Main navigation")}
      >
        {links}
      </nav>
    </>
  );
}

export default AppNavigation;

import { BookOpen, Camera, Folder, NotebookText, PenLine, Search, Settings, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const ITEMS = [
  { label: "Læs", to: "/new", icon: BookOpen, active: true },
  { label: "Skriv", to: "/write", icon: PenLine },
  { label: "Noter", to: "/notes", icon: NotebookText },
  { label: "Ordbog", action: "dictionary", icon: Search },
  { label: "Scan", to: "/new", icon: Camera },
  { label: "Mine filer", to: "/dashboard", icon: Folder },
  { label: "Indstillinger", to: "/settings", icon: Settings },
] as const;

export function ReaderWorkspaceSidebar({ onDictionary }: { onDictionary: () => void }) {
  return (
    <aside className="rr-workspace-sidebar" aria-label="Min læseplads">
      <Link to="/dashboard" className="mb-5 flex items-center gap-2 px-3 text-sm font-bold text-primary">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-xl" aria-hidden="true">🌊</span>
        Min læseplads
      </Link>
      <nav className="space-y-1">
        {ITEMS.map(({ label, icon: Icon, ...item }) => {
          const classes = `rr-sidebar-link ${"active" in item && item.active ? "is-active" : ""}`;
          if ("action" in item) return <button key={label} type="button" onClick={onDictionary} className={classes}><Icon aria-hidden="true" />{label}</button>;
          return <Link key={label} to={item.to} className={classes}><Icon aria-hidden="true" />{label}</Link>;
        })}
      </nav>
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("reliefread:open-riley", { detail: { prompt: "Hvad vil du gerne have hjælp til?" } }))} className="rr-sidebar-link mt-1 bg-blue-100/80 text-blue-900">
        <Sparkles aria-hidden="true" />Spørg Riley
      </button>
    </aside>
  );
}

export default ReaderWorkspaceSidebar;

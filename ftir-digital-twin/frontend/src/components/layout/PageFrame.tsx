import { Moon, Search, Sun } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useApp } from "../../store/app";
import { cx } from "../ui";

function ModePill() {
  const mode = useApp((s) => s.mode);
  if (mode === "checking") return <span className="text-[11px] text-faint">Connecting…</span>;
  const live = mode === "live";
  return (
    <span
      title={live ? "Connected to the Express backend" : "Backend not reachable, showing built-in demo data"}
      className={cx(
        "hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] border",
        live ? "border-safe/30 text-safe" : "border-sev-medium/30 text-sev-medium",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {live ? "Live backend" : "Demo data"}
    </span>
  );
}

function SearchPill() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const setActive = useApp((s) => s.setActive);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let id = value.trim().toUpperCase();
    if (!id) return;
    if (/^\d+$/.test(id)) id = `FTIR-${id}`;
    setBusy(true);
    try {
      const report = await api.getReport(id);
      setActive(report.ftirNumber);
      toast.success(`${report.ftirNumber} is now the active incident`);
      setValue("");
    } catch {
      toast.error(`Couldn't find ${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="relative hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-faint" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
        placeholder="Search FTIR ID"
        className="h-8 w-52 rounded-full bg-raised border border-transparent focus:border-line pl-8 pr-3 text-xs font-mono placeholder:font-sans placeholder:text-faint outline-none"
      />
    </form>
  );
}

function ThemeToggle() {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8 grid place-items-center rounded-full text-muted hover:text-fg hover:bg-raised"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function PageFrame({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="no-print sticky top-0 z-20 bg-page/90 backdrop-blur-sm border-b border-divider">
        <div className="h-14 px-3 sm:px-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-medium leading-tight truncate">{title}</h1>
            <p className="text-[11px] text-muted truncate">{subtitle}</p>
          </div>
          <SearchPill />
          <ModePill />
          <ThemeToggle />
        </div>
      </header>
      {actions && <div className="no-print px-3 pt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      <main className="print-area flex-1 p-3 pb-20 sm:pb-3">{children}</main>
    </div>
  );
}
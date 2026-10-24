import { ChevronsLeft, ChevronsRight, Shield } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "../../store/app";
import { cx } from "../ui";
import { NAV } from "./nav";

export function Sidebar() {
  const expanded = useApp((s) => s.sidebarExpanded);
  const toggle = useApp((s) => s.toggleSidebar);
  const { search } = useLocation();

  return (
    <nav
      className={cx(
        "no-print hidden sm:flex flex-col shrink-0 h-full border-r border-line bg-card transition-[width] duration-200",
        expanded ? "w-[208px]" : "w-14",
      )}
    >
      <div className="h-14 flex items-center gap-2.5 px-3.5 border-b border-divider">
        <div className="h-7 w-7 shrink-0 rounded-lg bg-accent-soft text-accent grid place-items-center">
          <Shield className="h-4 w-4" />
        </div>
        {expanded && <span className="text-[13px] font-medium leading-tight truncate">Cyber Incident<br /><span className="text-muted">Analyzer</span></span>}
      </div>

      <ul className="flex-1 flex flex-col gap-1 p-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <li key={to} className="relative group">
            <NavLink
              to={{ pathname: to, search }}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 h-10 rounded-full px-2.5 text-[13px] transition-colors",
                  isActive ? "bg-accent-soft text-accent-ink" : "text-muted hover:text-fg hover:bg-raised",
                )
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {expanded && <span className="truncate">{label}</span>}
            </NavLink>
            {!expanded && (
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 whitespace-nowrap rounded-full bg-fg text-page text-[11px] px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {label}
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={toggle}
        className="m-2 h-9 rounded-full grid place-items-center text-muted hover:text-fg hover:bg-raised"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
      </button>
    </nav>
  );
}

/** Bottom tab bar for phones. */
export function MobileNav() {
  const { search } = useLocation();
  return (
    <nav className="no-print sm:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-line flex justify-around py-1.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={{ pathname: to, search }}
          aria-label={label}
          className={({ isActive }) => cx("h-10 w-10 grid place-items-center rounded-full", isActive ? "bg-accent-soft text-accent-ink" : "text-muted")}
        >
          <Icon className="h-[18px] w-[18px]" />
        </NavLink>
      ))}
    </nav>
  );
}

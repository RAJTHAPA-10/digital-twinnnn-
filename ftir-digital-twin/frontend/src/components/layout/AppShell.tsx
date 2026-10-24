import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { detectMode } from "../../services/api";
import { useApp } from "../../store/app";
import { MobileNav, Sidebar } from "./Sidebar";

export function AppShell() {
  const setMode = useApp((s) => s.setMode);
  const activeKey = useApp((s) => s.activeKey);
  const setActive = useApp((s) => s.setActive);
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();

  // Decide live vs demo once on load.
  useEffect(() => {
    let cancelled = false;
    detectMode().then((m) => {
      if (cancelled) return;
      qc.clear();
      setMode(m);
    });
    return () => {
      cancelled = true;
    };
  }, [qc, setMode]);

  // Keep ?ftir= and the active incident in sync. A URL change wins (links, back button);
  // otherwise a store change (picker, search) is written to the URL.
  const urlFtir = params.get("ftir");
  const lastUrl = useRef<string | null>(null);
  useEffect(() => {
    if (urlFtir && urlFtir !== lastUrl.current) {
      lastUrl.current = urlFtir;
      if (urlFtir !== activeKey) setActive(urlFtir);
      return;
    }
    const current = useApp.getState().activeKey; // fresh value, not this render's snapshot
    if (current && current !== urlFtir) {
      lastUrl.current = current;
      const next = new URLSearchParams(params);
      next.set("ftir", current);
      setParams(next, { replace: true });
    }
  }, [urlFtir, activeKey, params, setParams, setActive]);

  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  );
}

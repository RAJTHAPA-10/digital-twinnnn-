import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScenarioType } from "../types/api";

export type Mode = "checking" | "live" | "mock";

export interface PipelineIds {
  scenarioType: ScenarioType;
  durationMs: number;
  simulationRunId?: string;
  impactId?: string;
  finalReportId?: string;
}

interface AppState {
  theme: "dark" | "light";
  sidebarExpanded: boolean;
  mode: Mode;
  /** ftirNumber, or "manual:<SCENARIO>" for a simulation started without an FTIR. */
  activeKey: string | null;
  pipelines: Record<string, PipelineIds>;
  planned: Record<string, string[]>;

  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  setMode: (mode: Mode) => void;
  setActive: (key: string | null) => void;
  setPipeline: (key: string, ids: PipelineIds) => void;
  patchPipeline: (key: string, patch: Partial<PipelineIds>) => void;
  togglePlanned: (key: string, title: string) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      theme: "dark",
      sidebarExpanded: false,
      mode: "checking",
      activeKey: null,
      pipelines: {},
      planned: {},

      setTheme: (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        try {
          localStorage.setItem("vcia-theme", theme);
        } catch {
          /* storage unavailable */
        }
        set({ theme });
      },
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setMode: (mode) => set({ mode }),
      setActive: (activeKey) => set({ activeKey }),
      setPipeline: (key, ids) => set((s) => ({ pipelines: { ...s.pipelines, [key]: ids } })),
      patchPipeline: (key, patch) =>
        set((s) => {
          const current = s.pipelines[key];
          if (!current) return s;
          return { pipelines: { ...s.pipelines, [key]: { ...current, ...patch } } };
        }),
      togglePlanned: (key, title) =>
        set((s) => {
          const list = s.planned[key] ?? [];
          const next = list.includes(title) ? list.filter((t) => t !== title) : [...list, title];
          return { planned: { ...s.planned, [key]: next } };
        }),
    }),
    {
      name: "vcia-state",
      // Pipeline ids are namespaced by mode so demo ids never hit the live backend.
      partialize: (s) => ({ theme: s.theme, sidebarExpanded: s.sidebarExpanded, activeKey: s.activeKey, pipelines: s.pipelines, planned: s.planned }),
    },
  ),
);

export const isManualKey = (key: string | null | undefined) => Boolean(key?.startsWith("manual:"));
export const pipelineKey = (mode: Mode, key: string) => `${mode}|${key}`;

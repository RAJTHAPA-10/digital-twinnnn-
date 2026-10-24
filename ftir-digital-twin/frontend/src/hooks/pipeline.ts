import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../services/api";
import { isNotFound } from "../services/http";
import { isManualKey, pipelineKey, useApp, type PipelineIds } from "../store/app";
import type { FinalReport, ImpactRecord, ScenarioType, SimulationRun } from "../types/api";

const store = () => useApp.getState();

const ftirOf = (key: string) => (isManualKey(key) ? undefined : key);

const notifyRerun = () =>
  toast.info(store().mode === "mock" ? "Re-ran the simulation (demo data resets on reload)" : "Re-ran the simulation (backend was restarted)");

const inflight = new Map<string, Promise<unknown>>();
function once<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(id) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

const ensureSim = (key: string) => once(`ensureSim|${store().mode}|${key}`, () => ensureSimRaw(key));
async function ensureSimRaw(key: string): Promise<SimulationRun | null> {
  const s = store();
  const pk = pipelineKey(s.mode, key);
  const ids = s.pipelines[pk];
  if (!ids) return null;
  if (ids.simulationRunId) {
    try {
      return await api.getSimulation(ids.simulationRunId);
    } catch (e) {
      if (!isNotFound(e)) throw e;
      notifyRerun();
    }
  }
  const run = await api.createSimulation({ scenarioType: ids.scenarioType, durationMs: ids.durationMs });
  store().patchPipeline(pk, { simulationRunId: run.runId, impactId: undefined, finalReportId: undefined });
  return run;
}

const ensureImpact = (key: string) => once(`ensureImpact|${store().mode}|${key}`, () => ensureImpactRaw(key));
async function ensureImpactRaw(key: string): Promise<ImpactRecord | null> {
  const sim = await ensureSim(key);
  if (!sim) return null;
  const pk = pipelineKey(store().mode, key);
  const ids = store().pipelines[pk];
  if (ids?.impactId) {
    try {
      const rec = await api.getImpact(ids.impactId);
      if (rec.simulationRunId === sim.runId) return rec;
    } catch (e) {
      if (!isNotFound(e)) throw e;
    }
  }
  const rec = await api.createImpact(sim.runId);
  store().patchPipeline(pk, { impactId: rec.impactId, finalReportId: undefined });
  return rec;
}

const ensureReport = (key: string) => once(`ensureReport|${store().mode}|${key}`, () => ensureReportRaw(key));
async function ensureReportRaw(key: string): Promise<FinalReport | null> {
  const impact = await ensureImpact(key);
  if (!impact) return null;
  const pk = pipelineKey(store().mode, key);
  const ids = store().pipelines[pk];
  if (ids?.finalReportId) {
    try {
      const r = await api.getFinalReport(ids.finalReportId);
      if (r.impactId === impact.impactId) return r;
    } catch (e) {
      if (!isNotFound(e)) throw e;
    }
  }
  const r = await api.createFinalReport(impact.impactId, ftirOf(key));
  store().patchPipeline(pk, { finalReportId: r.reportId });
  return r;
}

export const usePipelineIds = (key: string | null): PipelineIds | undefined => {
  const mode = useApp((s) => s.mode);
  return useApp((s) => (key ? s.pipelines[pipelineKey(mode, key)] : undefined));
};

export const useSimulation = (key: string | null) => {
  const mode = useApp((s) => s.mode);
  const ids = usePipelineIds(key);
  return useQuery({
    queryKey: [mode, "sim", key, ids?.simulationRunId ?? null],
    queryFn: () => ensureSim(key!),
    enabled: mode !== "checking" && Boolean(key && ids),
    staleTime: Infinity,
    retry: false,
  });
};

export const useImpact = (key: string | null) => {
  const mode = useApp((s) => s.mode);
  const ids = usePipelineIds(key);
  return useQuery({
    queryKey: [mode, "impact", key, ids?.simulationRunId ?? null, ids?.impactId ?? null],
    queryFn: () => ensureImpact(key!),
    enabled: mode !== "checking" && Boolean(key && ids),
    staleTime: Infinity,
    retry: false,
  });
};

export const useFinalReport = (key: string | null) => {
  const mode = useApp((s) => s.mode);
  const ids = usePipelineIds(key);
  return useQuery({
    queryKey: [mode, "final", key, ids?.impactId ?? null, ids?.finalReportId ?? null],
    queryFn: () => ensureReport(key!),
    enabled: mode !== "checking" && Boolean(key && ids),
    staleTime: Infinity,
    retry: false,
  });
};

export const useRunPipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, scenarioType, durationMs }: { key: string; scenarioType: ScenarioType; durationMs: number }) => {
      const mode = store().mode;
      const pk = pipelineKey(mode, key);
      const run = await api.createSimulation({ scenarioType, durationMs });
      const impact = await api.createImpact(run.runId);
      const report = await api.createFinalReport(impact.impactId, ftirOf(key));
      qc.setQueryData([mode, "sim", key, run.runId], run);
      qc.setQueryData([mode, "impact", key, run.runId, impact.impactId], impact);
      qc.setQueryData([mode, "final", key, impact.impactId, report.reportId], report);
      store().setPipeline(pk, {
        scenarioType,
        durationMs,
        simulationRunId: run.runId,
        impactId: impact.impactId,
        finalReportId: report.reportId,
      });
      return { run, impact, report };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [store().mode, "impacts"] });
    },
  });
};

export const durationFromSeconds = (seconds: number | null | undefined) =>
  Math.min(60_000, Math.max(1_000, Math.round((seconds ?? 10) * 1000 / 100) * 100));
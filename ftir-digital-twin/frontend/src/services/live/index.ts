import type {
  Api,
  AttackProfileList,
  AttackSummary,
  ClassificationSummary,
  ClassifiedList,
  FinalReport,
  FtirStats,
  ImpactRecord,
  Report,
  ReportList,
  RunResult,
  SimulationRun,
  UploadResult,
} from "../../types/api";
import { AI_TIMEOUT, request } from "../http";

// NOTE: the backend uses two prefixes: /api/v1/... (stages 1-3) and /api/... (stages 4-6).
export const liveApi: Api = {
  async health() {
    try {
      await request("/api/v1/health", { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  },

  listReports: ({ page = 1, limit = 20, status, model }) =>
    request<ReportList>("/api/v1/ftir", { query: { page, limit, status, model } }),
  getReport: (ftirNumber) => request<Report>(`/api/v1/ftir/${encodeURIComponent(ftirNumber)}`),
  getStats: () => request<FtirStats>("/api/v1/ftir/stats/summary"),
  uploadCsv: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request<UploadResult>("/api/v1/ftir/upload", { method: "POST", form, timeout: 120_000 });
  },

  classificationSummary: () => request<ClassificationSummary>("/api/v1/classification/summary"),
  listClassified: (label, page, limit) =>
    request<ClassifiedList>(
      label === "CYBERSECURITY" ? "/api/v1/classification/cybersecurity" : "/api/v1/classification/non-cybersecurity",
      { query: { page, limit } },
    ),
  classifyBatch: (limit) =>
    request<RunResult>("/api/v1/classification/run", { method: "POST", body: limit ? { limit } : {}, timeout: AI_TIMEOUT }),
  classifyAll: (batchSize) =>
    request<RunResult>("/api/v1/classification/run-all", { method: "POST", body: batchSize ? { batchSize } : {}, timeout: AI_TIMEOUT }),

  attackSummary: () => request<AttackSummary>("/api/v1/attack-identification/summary"),
  listProfiles: (page, limit, unclassifiedOnly) =>
    request<AttackProfileList>(
      unclassifiedOnly ? "/api/v1/attack-identification/unclassified" : "/api/v1/attack-identification/profiles",
      { query: { page, limit } },
    ),
  identifyBatch: (batchSize) =>
    request<RunResult>("/api/v1/attack-identification/run", { method: "POST", body: batchSize ? { batchSize } : {}, timeout: AI_TIMEOUT }),
  identifyAll: (batchSize) =>
    request<RunResult>("/api/v1/attack-identification/run-all", { method: "POST", body: batchSize ? { batchSize } : {}, timeout: AI_TIMEOUT }),

  createSimulation: (body) => request<SimulationRun>("/api/simulations", { method: "POST", body }),
  getSimulation: (runId) => request<SimulationRun>(`/api/simulations/${encodeURIComponent(runId)}`),

  createImpact: (simulationRunId) => request<ImpactRecord>("/api/impact-analysis", { method: "POST", body: { simulationRunId } }),
  getImpact: (impactId) => request<ImpactRecord>(`/api/impact-analysis/${encodeURIComponent(impactId)}`),
  listImpacts: () => request<{ impactId: string; severityScore: number; attackType: string }[]>("/api/impact-analysis"),

    createFinalReport: (impactId, ftirNumber) =>
    request<FinalReport>("/api/recommendations", { method: "POST", body: { impactId, ftirNumber }, timeout: 120_000 }),
  getFinalReport: (reportId) => request<FinalReport>(`/api/recommendations/${encodeURIComponent(reportId)}`),
};

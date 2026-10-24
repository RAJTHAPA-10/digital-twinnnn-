import type {
  Api,
  AttackProfile,
  ClassifiedReport,
  FinalReport,
  ImpactRecord,
  Report,
  SimulationRun,
} from "../../types/api";
import { ApiError } from "../http";
import { MOCK_SEEDS, type MockSeed } from "./data";
import { FIXTURES } from "./fixtures";
import { simulate } from "./simulator";

// In-memory demo backend. Same method signatures and return shapes as the live API.
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const iso = (d: string) => new Date(`${d}T09:00:00.000Z`).toISOString();

interface State {
  classified: Set<string>;
  identified: Set<string>;
  sims: Map<string, SimulationRun>;
  impacts: Map<string, ImpactRecord>;
  reports: Map<string, FinalReport>;
  seq: { sim: number; impact: number; report: number };
}

const state: State = {
  classified: new Set(MOCK_SEEDS.filter((s) => !s.pendingClassification).map((s) => s.ftirNumber)),
  identified: new Set(MOCK_SEEDS.filter((s) => s.attack && !s.attack.pending && !s.pendingClassification).map((s) => s.ftirNumber)),
  sims: new Map(),
  impacts: new Map(),
  reports: new Map(),
  seq: { sim: 0, impact: 0, report: 0 },
};

const id = (seed: MockSeed) => `mock_${seed.ftirNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

const toReport = (seed: MockSeed): Report => {
  const classified = state.classified.has(seed.ftirNumber);
  const identified = state.identified.has(seed.ftirNumber);
  return {
    id: id(seed),
    ftirNumber: seed.ftirNumber,
    vehicleModel: seed.vehicleModel,
    mileage: seed.mileage,
    registrationDate: iso(seed.registrationDate),
    ftirReportDate: iso(seed.ftirReportDate),
    incidentDate: iso(seed.incidentDate),
    rawSubject: seed.subject,
    cleanedSubject: seed.subject,
    sourceType: "COMPANY",
    processingStatus: identified ? "ATTACK_IDENTIFIED" : classified ? "CLASSIFIED" : "PREPROCESSED",
    processingError: null,
    createdAt: iso(seed.ftirReportDate),
  };
};

const toClassified = (seed: MockSeed): ClassifiedReport => {
  const r = toReport(seed);
  return {
    id: r.id, ftirNumber: r.ftirNumber, vehicleModel: r.vehicleModel, mileage: r.mileage,
    registrationDate: r.registrationDate, ftirReportDate: r.ftirReportDate, incidentDate: r.incidentDate,
    cleanedSubject: r.cleanedSubject, processingStatus: r.processingStatus,
    classification: {
      label: seed.label, confidenceScore: seed.confidence, reason: seed.reason, modelName: "demo-model",
      classifiedAt: iso(seed.ftirReportDate), reviewRequired: Boolean(seed.reviewRequired),
      reviewReason: seed.reviewRequired ? "Confidence below the review threshold or ambiguous wording." : null,
    },
  };
};

const toProfile = (seed: MockSeed): AttackProfile => {
  const a = seed.attack!;
  const unclassified = a.code === "UNCLASSIFIED";
  return {
    id: `profile_${id(seed)}`,
    reportId: id(seed),
    rootCause: a.rootCause,
    attackDescription: a.description,
    confidenceScore: a.confidence,
    identificationStatus: unclassified ? "UNCLASSIFIED" : "IDENTIFIED",
    simulationParameters: { scenario: `${a.code} test scenario`, durationSeconds: a.durationSeconds, expectedEffects: a.expectedEffects },
    rawAiResponse: { targetedEcus: a.targetedEcus },
    identifiedAt: iso(seed.ftirReportDate),
    attackType: { code: a.code, name: a.code.replace(/_/g, " ").toLowerCase(), description: null },
    report: {
      id: id(seed), ftirNumber: seed.ftirNumber, vehicleModel: seed.vehicleModel, cleanedSubject: seed.subject,
      sourceType: "COMPANY", classification: { confidenceScore: seed.confidence, reason: seed.reason },
    },
  };
};

const paginate = <T>(items: T[], page: number, limit: number) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    slice: items.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, totalItems, totalPages, hasNextPage: page * limit < totalItems, hasPreviousPage: page > 1 },
  };
};

const classifiedSeeds = () => MOCK_SEEDS.filter((s) => state.classified.has(s.ftirNumber));
const profileSeeds = () => MOCK_SEEDS.filter((s) => s.attack && state.identified.has(s.ftirNumber));

export const mockApi: Api = {
  health: async () => true,

  async listReports({ page = 1, limit = 20, status, model }) {
    await wait();
    let rows = MOCK_SEEDS.map(toReport);
    if (status) rows = rows.filter((r) => r.processingStatus === status);
    if (model) rows = rows.filter((r) => r.vehicleModel === model.toUpperCase());
    const { slice, pagination } = paginate(rows, page, limit);
    return {
      reports: slice,
      pagination: { page, limit, totalReports: pagination.totalItems, totalPages: pagination.totalPages },
      filters: { processingStatus: status || null, vehicleModel: model || null },
    };
  },

  async getReport(ftirNumber) {
    await wait(120);
    const seed = MOCK_SEEDS.find((s) => s.ftirNumber === ftirNumber);
    if (!seed) throw new ApiError(`Report not found: ${ftirNumber}`, 404);
    return toReport(seed);
  },

  async getStats() {
    await wait();
    const rows = MOCK_SEEDS.map(toReport);
    const count = (s: string) => rows.filter((r) => r.processingStatus === s).length;
    return {
      totalReports: rows.length, uploadedReports: count("UPLOADED"), preprocessedReports: count("PREPROCESSED"),
      classifiedReports: count("CLASSIFIED"), attackIdentifiedReports: count("ATTACK_IDENTIFIED"),
      simulatedReports: 0, analysedReports: 0, reportedReports: 0, failedReports: 0,
    };
  },

  async uploadCsv(file) {
    await wait(600);
    return { fileName: file.name, validReports: 0, message: "Demo mode: upload accepted but not stored." };
  },

  async classificationSummary() {
    await wait();
    const c = classifiedSeeds();
    return {
      totalReports: MOCK_SEEDS.length,
      pendingCount: MOCK_SEEDS.length - c.length,
      classifiedCount: c.length,
      cybersecurityCount: c.filter((s) => s.label === "CYBERSECURITY").length,
      nonCybersecurityCount: c.filter((s) => s.label === "NON_CYBERSECURITY").length,
      reviewRequiredCount: c.filter((s) => s.reviewRequired).length,
    };
  },

  async listClassified(label, page, limit) {
    await wait();
    const { slice, pagination } = paginate(classifiedSeeds().filter((s) => s.label === label).map(toClassified), page, limit);
    return { reports: slice, pagination };
  },

  async classifyBatch(limit = 10) {
    await wait(1200);
    const pending = MOCK_SEEDS.filter((s) => !state.classified.has(s.ftirNumber)).slice(0, limit);
    pending.forEach((s) => state.classified.add(s.ftirNumber));
    return { message: "Demo batch classified.", processedCount: pending.length };
  },

  async classifyAll() {
    await wait(1800);
    const pending = MOCK_SEEDS.filter((s) => !state.classified.has(s.ftirNumber));
    pending.forEach((s) => state.classified.add(s.ftirNumber));
    return { message: "All pending demo reports classified.", processedCount: pending.length };
  },

  async attackSummary() {
    await wait();
    const p = profileSeeds();
    const eligible = MOCK_SEEDS.filter((s) => s.attack && state.classified.has(s.ftirNumber) && !state.identified.has(s.ftirNumber) && !s.reviewRequired);
    const codes = [...new Set(p.map((s) => s.attack!.code))];
    return {
      eligibleCount: eligible.length,
      identifiedCount: p.filter((s) => s.attack!.code !== "UNCLASSIFIED").length,
      unclassifiedCount: p.filter((s) => s.attack!.code === "UNCLASSIFIED").length,
      byAttackType: codes.map((code) => ({
        attackType: { id: code, code, name: code.replace(/_/g, " ").toLowerCase() },
        count: p.filter((s) => s.attack!.code === code).length,
      })),
    };
  },

  async listProfiles(page, limit, unclassifiedOnly) {
    await wait();
    let rows = profileSeeds().map(toProfile);
    if (unclassifiedOnly) rows = rows.filter((p) => p.identificationStatus === "UNCLASSIFIED");
    const { slice, pagination } = paginate(rows, page, limit);
    return { profiles: slice, pagination };
  },

  async identifyBatch(batchSize = 3) {
    await wait(1500);
    const pending = MOCK_SEEDS.filter((s) => s.attack && state.classified.has(s.ftirNumber) && !state.identified.has(s.ftirNumber)).slice(0, batchSize);
    pending.forEach((s) => state.identified.add(s.ftirNumber));
    return { message: "Demo attack batch identified.", processedCount: pending.length };
  },

  async identifyAll() {
    await wait(2000);
    const pending = MOCK_SEEDS.filter((s) => s.attack && state.classified.has(s.ftirNumber) && !state.identified.has(s.ftirNumber));
    pending.forEach((s) => state.identified.add(s.ftirNumber));
    return { message: "All demo cyber reports identified.", processedCount: pending.length };
  },

  async createSimulation({ scenarioType, durationMs = 10_000, tickIntervalMs = 100, scenarioConfig = {} }) {
    await wait(400);
    state.seq.sim += 1;
    const runId = `simulation-${String(state.seq.sim).padStart(5, "0")}`;
    const now = new Date().toISOString();
    const run: SimulationRun = {
      runId, status: "COMPLETED", startedAt: now, completedAt: now,
      input: { scenarioType, durationMs, tickIntervalMs, scenarioConfig },
      result: simulate(scenarioType, durationMs, tickIntervalMs),
    };
    state.sims.set(runId, run);
    return structuredClone(run);
  },

  async getSimulation(runId) {
    await wait(150);
    const run = state.sims.get(runId);
    if (!run) throw new ApiError(`Simulation run ${runId} was not found.`, 404);
    return structuredClone(run);
  },

  async createImpact(simulationRunId) {
    await wait(300);
    const run = state.sims.get(simulationRunId);
    if (!run) throw new ApiError(`Simulation run ${simulationRunId} was not found.`, 404);
    state.seq.impact += 1;
    const record: ImpactRecord = {
      impactId: `impact-${String(state.seq.impact).padStart(5, "0")}`,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
      simulationRunId,
      analysis: structuredClone(FIXTURES[run.input.scenarioType].analysis),
    };
    state.impacts.set(record.impactId, record);
    return structuredClone(record);
  },

  async getImpact(impactId) {
    await wait(150);
    const rec = state.impacts.get(impactId);
    if (!rec) throw new ApiError(`Impact analysis ${impactId} was not found.`, 404);
    return structuredClone(rec);
  },

  async listImpacts() {
    await wait(150);
    return [...state.impacts.values()].map((i) => ({ impactId: i.impactId, severityScore: i.analysis.severityScore, attackType: i.analysis.attackType }));
  },

  async createFinalReport(impactId) {
    await wait(300);
    const existing = [...state.reports.values()].find((r) => r.impactId === impactId);
    if (existing) return structuredClone(existing);
    const impact = state.impacts.get(impactId);
    if (!impact) throw new ApiError(`Impact analysis ${impactId} was not found.`, 404);
    const fx = FIXTURES[impact.analysis.attackType];
    const a = impact.analysis;
    state.seq.report += 1;
    const report: FinalReport = {
      reportId: `report-${String(state.seq.report).padStart(5, "0")}`,
      createdAt: new Date().toISOString(), status: "COMPLETED", impactId,
      attackType: a.attackType, severity: a.severity, severityScore: a.severityScore, riskLevel: a.riskLevel, affectedEcus: a.affectedEcus,
      content: {
        title: fx.title, executiveSummary: fx.executiveSummary,
        incidentDetails: { impactId, simulationRunId: impact.simulationRunId, attackType: a.attackType, createdAt: impact.createdAt },
        impactAssessment: {
          affectedEcus: a.affectedEcus, vehicleImpact: a.vehicleImpact, networkImpact: a.networkImpact,
          severity: a.severity, severityScore: a.severityScore, riskLevel: a.riskLevel, propagationPath: a.propagationPath,
        },
        rootCauseSummary: fx.rootCauseSummary, recommendations: fx.recommendations, disclaimer: fx.disclaimer,
      },
    };
    state.reports.set(report.reportId, report);
    return structuredClone(report);
  },

  async getFinalReport(reportId) {
    await wait(150);
    const r = state.reports.get(reportId);
    if (!r) throw new ApiError(`Report ${reportId} not found.`, 404);
    return structuredClone(r);
  },
};

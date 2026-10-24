import { getSimulationRun } from "../digitalTwin/simulation.service.js";
import { analyzeSimulationImpact } from "./core/impactAnalyzer.js";
import { validateImpactAnalysisRequest } from "./impact.schema.js";

export class SimulationRunNotFoundError extends Error {
  constructor(simulationRunId) {
    super(`Simulation run ${simulationRunId} was not found.`);
    this.name = "SimulationRunNotFoundError";
  }
}

const impactAnalyses = new Map();
let impactSequence = 0;

const createImpactId = () => {
  impactSequence += 1;
  return `impact-${String(impactSequence).padStart(5, "0")}`;
};

export const createImpactAnalysis = (payload) => {
  const { simulationRunId } = validateImpactAnalysisRequest(payload);
  const simulationRun = getSimulationRun(simulationRunId);

  if (!simulationRun) {
    throw new SimulationRunNotFoundError(simulationRunId);
  }

  const analysis = analyzeSimulationImpact(simulationRun.result);
  const impactRecord = {
    impactId: createImpactId(),
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    simulationRunId,
    analysis,
  };

  impactAnalyses.set(impactRecord.impactId, impactRecord);

  return structuredClone(impactRecord);
};

export const getImpactAnalysis = (impactId) => {
  const impactRecord = impactAnalyses.get(impactId);
  return impactRecord ? structuredClone(impactRecord) : null;
};

export const listImpactAnalyses = () =>
  [...impactAnalyses.values()].map((impactRecord) => ({
    impactId: impactRecord.impactId,
    status: impactRecord.status,
    createdAt: impactRecord.createdAt,
    simulationRunId: impactRecord.simulationRunId,
    attackType: impactRecord.analysis.attackType,
    severity: impactRecord.analysis.severity,
    severityScore: impactRecord.analysis.severityScore,
    riskLevel: impactRecord.analysis.riskLevel,
    affectedEcus: impactRecord.analysis.affectedEcus,
  }));
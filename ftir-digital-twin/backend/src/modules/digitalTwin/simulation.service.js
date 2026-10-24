import { runSimulation } from "./simulation.engine.js";
import { validateSimulationRequest } from "./simulation.schema.js";

const completedRuns = new Map();
const MAX_STORED_RUNS = 50;
let runSequence = 0;

const createRunId = () => {
  runSequence += 1;
  return `simulation-${String(runSequence).padStart(5, "0")}`;
};

const retainCompletedRuns = () => {
  while (completedRuns.size > MAX_STORED_RUNS) {
    const oldestRunId = completedRuns.keys().next().value;
    completedRuns.delete(oldestRunId);
  }
};

export const startSimulation = (payload) => {
  const input = validateSimulationRequest(payload);
  const runId = createRunId();
  const startedAt = new Date().toISOString();
  const result = runSimulation(input);
  const completedAt = new Date().toISOString();

  const simulationRun = {
    runId,
    status: "COMPLETED",
    startedAt,
    completedAt,
    input,
    result,
  };

  completedRuns.set(runId, simulationRun);
  retainCompletedRuns();

  return structuredClone(simulationRun);
};

export const getSimulationRun = (runId) => {
  const simulationRun = completedRuns.get(runId);
  return simulationRun ? structuredClone(simulationRun) : null;
};

export const listSimulationRuns = () =>
  [...completedRuns.values()].map((simulationRun) => ({
    runId: simulationRun.runId,
    status: simulationRun.status,
    startedAt: simulationRun.startedAt,
    completedAt: simulationRun.completedAt,
    scenarioType: simulationRun.input.scenarioType,
    summary: simulationRun.result.summary,
  }));
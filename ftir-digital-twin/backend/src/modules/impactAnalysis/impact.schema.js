export class ImpactValidationError extends Error {
  constructor(errors) {
    super("Impact-analysis request validation failed.");
    this.name = "ImpactValidationError";
    this.errors = errors;
  }
}

export const validateImpactAnalysisRequest = (payload = {}) => {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ImpactValidationError(["Request body must be a JSON object."]);
  }

  const simulationRunId = payload.simulationRunId;

  if (typeof simulationRunId !== "string" || simulationRunId.trim().length === 0) {
    throw new ImpactValidationError([
      "simulationRunId must be a non-empty string.",
    ]);
  }

  return {
    simulationRunId: simulationRunId.trim(),
  };
};
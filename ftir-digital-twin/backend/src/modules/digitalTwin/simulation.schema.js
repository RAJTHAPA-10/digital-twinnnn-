import {
  getSupportedScenarioTypes,
  isSupportedScenarioType,
} from "./core/scenarioRegistry.js";

export class SimulationValidationError extends Error {
  constructor(errors) {
    super("Simulation request validation failed.");
    this.name = "SimulationValidationError";
    this.errors = errors;
  }
}

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readPositiveInteger = ({ value, field, fallback, errors }) => {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${field} must be a positive integer.`);
    return fallback;
  }

  return value;
};

export const validateSimulationRequest = (payload = {}) => {
  const errors = [];

  if (!isPlainObject(payload)) {
    throw new SimulationValidationError(["Request body must be a JSON object."]);
  }

  const scenarioType = payload.scenarioType;
  const durationMs = readPositiveInteger({
    value: payload.durationMs,
    field: "durationMs",
    fallback: 10_000,
    errors,
  });
  const tickIntervalMs = readPositiveInteger({
    value: payload.tickIntervalMs,
    field: "tickIntervalMs",
    fallback: 100,
    errors,
  });
  const scenarioConfig = payload.scenarioConfig ?? {};

  if (typeof scenarioType !== "string" || !isSupportedScenarioType(scenarioType)) {
    errors.push(
      `scenarioType must be one of: ${getSupportedScenarioTypes().join(", ")}.`,
    );
  }

  if (durationMs > 60_000) {
    errors.push("durationMs must not exceed 60000.");
  }

  if (tickIntervalMs > 1_000) {
    errors.push("tickIntervalMs must not exceed 1000.");
  }

  if (durationMs < tickIntervalMs) {
    errors.push("durationMs must be greater than or equal to tickIntervalMs.");
  }

  if (!isPlainObject(scenarioConfig)) {
    errors.push("scenarioConfig must be a JSON object.");
  }

  if (errors.length > 0) {
    throw new SimulationValidationError(errors);
  }

  return {
    scenarioType,
    durationMs,
    tickIntervalMs,
    scenarioConfig,
  };
};
import {
  getSimulationRun,
  listSimulationRuns,
  startSimulation,
} from "./simulation.service.js";
import { SimulationValidationError } from "./simulation.schema.js";

export const createSimulation = (req, res) => {
  try {
    const simulationRun = startSimulation(req.body);

    return res.status(201).json({
      success: true,
      data: simulationRun,
    });
  } catch (error) {
    if (error instanceof SimulationValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "The virtual simulation could not be completed.",
    });
  }
};

export const getSimulations = (_req, res) =>
  res.status(200).json({
    success: true,
    data: listSimulationRuns(),
  });

export const getSimulationById = (req, res) => {
  const simulationRun = getSimulationRun(req.params.runId);

  if (!simulationRun) {
    return res.status(404).json({
      success: false,
      message: `Simulation run ${req.params.runId} was not found.`,
    });
  }

  return res.status(200).json({
    success: true,
    data: simulationRun,
  });
};
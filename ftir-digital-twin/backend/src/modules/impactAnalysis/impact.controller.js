import {
  SimulationRunNotFoundError,
  createImpactAnalysis,
  getImpactAnalysis,
  listImpactAnalyses,
} from "./impact.service.js";
import { ImpactValidationError } from "./impact.schema.js";

export const createImpact = (req, res) => {
  try {
    const impactRecord = createImpactAnalysis(req.body);

    return res.status(201).json({
      success: true,
      data: impactRecord,
    });
  } catch (error) {
    if (error instanceof ImpactValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    if (error instanceof SimulationRunNotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Impact analysis could not be completed.",
    });
  }
};

export const getImpacts = (_req, res) =>
  res.status(200).json({
    success: true,
    data: listImpactAnalyses(),
  });

export const getImpactById = (req, res) => {
  const impactRecord = getImpactAnalysis(req.params.impactId);

  if (!impactRecord) {
    return res.status(404).json({
      success: false,
      message: `Impact analysis ${req.params.impactId} was not found.`,
    });
  }

  return res.status(200).json({
    success: true,
    data: impactRecord,
  });
};
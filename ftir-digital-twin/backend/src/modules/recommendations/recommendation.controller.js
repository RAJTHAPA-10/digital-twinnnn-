import * as recommendationService from "./recommendation.service.js";
import { validateRecommendationRequest } from "./recommendation.schema.js";

export const createReport = async (req, res, next) => {
  try {
    const { impactId, ftirNumber } = validateRecommendationRequest(req.body);
    const report = await recommendationService.createFinalReport(impactId, ftirNumber);

    return res.status(201).json({
      success: true,
      data: report
    });
  } catch (err) {
    if (err.name === "RecommendationValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message,
        errors: err.errors
      });
    }

    if (err.name === "ImpactAnalysisNotFoundError") {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    next(err);
  }
};

export const getReportById = (req, res, next) => {
  try {
    const report = recommendationService.getReport(req.params.reportId);

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
};

export const getAllReports = (req, res, next) => {
  try {
    const reports = recommendationService.getAllReports();

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};
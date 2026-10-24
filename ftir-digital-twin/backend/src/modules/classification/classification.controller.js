import {
  getClassificationSummary,
  getReportsByClassificationLabel,
  runAllPendingClassifications,
  runClassificationBatch,
} from "./classification.service.js";

const getPositiveInteger = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : null;
};

export const classifyNextBatch = async (req, res, next) => {
  try {
    const requestedLimit = getPositiveInteger(req.body?.limit ?? req.query.limit);

    if (requestedLimit === null) {
      return res.status(400).json({
        success: false,
        message: "limit must be a positive integer.",
      });
    }

    const result = await runClassificationBatch(requestedLimit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const classifyAllPendingReports = async (req, res, next) => {
  try {
    const requestedBatchSize = getPositiveInteger(
      req.body?.batchSize ?? req.query.batchSize,
    );

    if (requestedBatchSize === null) {
      return res.status(400).json({
        success: false,
        message: "batchSize must be a positive integer.",
      });
    }

    const result = await runAllPendingClassifications(requestedBatchSize);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getClassificationOverview = async (req, res, next) => {
  try {
    const summary = await getClassificationSummary();

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return next(error);
  }
};

const getReportsForLabel = (label) => async (req, res, next) => {
  try {
    const page = getPositiveInteger(req.query.page);
    const limit = getPositiveInteger(req.query.limit);

    if (page === null || limit === null) {
      return res.status(400).json({
        success: false,
        message: "page and limit must be positive integers.",
      });
    }

    const result = await getReportsByClassificationLabel({
      label,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const getCybersecurityReports = getReportsForLabel("CYBERSECURITY");

export const getNonCybersecurityReports = getReportsForLabel(
  "NON_CYBERSECURITY",
);
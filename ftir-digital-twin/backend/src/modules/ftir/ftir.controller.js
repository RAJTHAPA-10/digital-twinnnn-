import {
  getReportByFtirNumber,
  getReports,
  getReportStats,
  importFtirCsv
} from "./ftir.service.js";

const allowedStatuses = [
  "UPLOADED",
  "PREPROCESSED",
  "CLASSIFIED",
  "ATTACK_IDENTIFIED",
  "SIMULATED",
  "ANALYSED",
  "REPORTED",
  "FAILED"
];

const parsePositiveInteger = (value, fallback, fieldName) => {
  if (value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    const error = new Error(`${fieldName} must be a positive integer.`);
    error.statusCode = 400;

    throw error;
  }

  return parsedValue;
};

export const uploadFtirCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error(
        'CSV file is required. Send it using form-data with key "file".'
      );

      error.statusCode = 400;
      throw error;
    }

    const result = await importFtirCsv(req.file);

    res.status(201).json({
      success: true,
      message: "FTIR CSV uploaded and preprocessing completed successfully.",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1, "page");
    const limit = parsePositiveInteger(req.query.limit, 20, "limit");

    if (limit > 100) {
      const error = new Error("limit cannot be greater than 100.");
      error.statusCode = 400;

      throw error;
    }

    const processingStatus = req.query.status?.toUpperCase();
    const vehicleModel = req.query.model?.trim();

    if (
      processingStatus &&
      !allowedStatuses.includes(processingStatus)
    ) {
      const error = new Error(
        `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
      );

      error.statusCode = 400;
      throw error;
    }

    const result = await getReports({
      page,
      limit,
      processingStatus,
      vehicleModel
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleReport = async (req, res, next) => {
  try {
    const report = await getReportByFtirNumber(req.params.ftirNumber);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

export const getFtirStats = async (req, res, next) => {
  try {
    const stats = await getReportStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
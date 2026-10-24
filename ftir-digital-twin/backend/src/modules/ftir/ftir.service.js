import fs from "fs/promises";

import prisma from "../../config/database.js";
import { parseFtirCsv } from "./ftir.parser.js";

export const importFtirCsv = async (file) => {
  try {
    const csvText = await fs.readFile(file.path, "utf-8");

    const {
      totalRows,
      validReports,
      failedRows,
      duplicateRows
    } = parseFtirCsv(csvText);

    let importedReports = 0;

    if (validReports.length > 0) {
      const result = await prisma.report.createMany({
        data: validReports,
        skipDuplicates: true
      });

      importedReports = result.count;
    }

    return {
      fileName: file.originalname,
      totalRows,
      validReports: validReports.length,
      importedReports,
      skippedDatabaseDuplicates: validReports.length - importedReports,
      duplicateRowsInFile: duplicateRows.length,
      failedRows: failedRows.length,
      duplicateDetails: duplicateRows,
      failureDetails: failedRows,
      currentPipelineStage: "PREPROCESSED"
    };
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
};

export const getReports = async ({
  page,
  limit,
  processingStatus,
  vehicleModel
}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(processingStatus && { processingStatus }),
    ...(vehicleModel && {
      vehicleModel: vehicleModel.toUpperCase()
    })
  };

  const [reports, totalReports] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
        { ftirNumber: "asc" }
      ]
    }),

    prisma.report.count({ where })
  ]);

  return {
    reports,
    pagination: {
      page,
      limit,
      totalReports,
      totalPages: Math.ceil(totalReports / limit)
    },
    filters: {
      processingStatus: processingStatus || null,
      vehicleModel: vehicleModel || null
    }
  };
};

export const getReportByFtirNumber = async (ftirNumber) => {
  const report = await prisma.report.findUnique({
    where: {
      ftirNumber
    }
  });

  if (!report) {
    const error = new Error(`Report not found: ${ftirNumber}`);
    error.statusCode = 404;

    throw error;
  }

  return report;
};

export const getReportStats = async () => {
  const [
    totalReports,
    uploadedReports,
    preprocessedReports,
    classifiedReports,
    attackIdentifiedReports,
    simulatedReports,
    analysedReports,
    reportedReports,
    failedReports
  ] = await Promise.all([
    prisma.report.count(),

    prisma.report.count({
      where: { processingStatus: "UPLOADED" }
    }),

    prisma.report.count({
      where: { processingStatus: "PREPROCESSED" }
    }),

    prisma.report.count({
      where: { processingStatus: "CLASSIFIED" }
    }),

    prisma.report.count({
      where: { processingStatus: "ATTACK_IDENTIFIED" }
    }),

    prisma.report.count({
      where: { processingStatus: "SIMULATED" }
    }),

    prisma.report.count({
      where: { processingStatus: "ANALYSED" }
    }),

    prisma.report.count({
      where: { processingStatus: "REPORTED" }
    }),

    prisma.report.count({
      where: { processingStatus: "FAILED" }
    })
  ]);

  return {
    totalReports,
    uploadedReports,
    preprocessedReports,
    classifiedReports,
    attackIdentifiedReports,
    simulatedReports,
    analysedReports,
    reportedReports,
    failedReports
  };
};
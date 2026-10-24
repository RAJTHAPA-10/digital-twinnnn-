import crypto from "node:crypto";
import prisma from "../../config/database.js";
import { geminiClient, geminiConfig } from "../../config/gemini.config.js";
import {
  classificationResponseJsonSchema,
  classificationResponseSchema,
} from "./classification.schema.js";
import {
  buildClassificationPrompt,
  CLASSIFICATION_SYSTEM_INSTRUCTION,
} from "./classification.prompt.js";

const MAX_BATCH_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const getErrorDetails = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = error?.status ?? error?.code ?? null;
  const isRateLimited =
    Number(statusCode) === 429 ||
    /429|rate limit|resource exhausted|quota/i.test(message);

  return {
    errorCode: statusCode ? String(statusCode) : null,
    errorMessage: message.slice(0, 2000),
    isRateLimited,
  };
};

const getUsageValues = (usageMetadata = {}) => ({
  inputTokens: usageMetadata.promptTokenCount ?? null,
  outputTokens: usageMetadata.candidatesTokenCount ?? null,
  totalTokens: usageMetadata.totalTokenCount ?? null,
});

const getSafeBatchSize = (requestedLimit) =>
  Math.min(
    Math.max(Number(requestedLimit) || geminiConfig.batchSize, 1),
    MAX_BATCH_SIZE,
  );

const validateModelResults = (classifications, reports) => {
  const expectedReportIds = new Set(reports.map((report) => report.id));
  const returnedReportIds = classifications.map((item) => item.reportId);
  const uniqueReturnedIds = new Set(returnedReportIds);

  if (uniqueReturnedIds.size !== returnedReportIds.length) {
    throw new Error("Gemini returned duplicate classification results.");
  }

  if (uniqueReturnedIds.size !== expectedReportIds.size) {
    throw new Error("Gemini returned an incomplete classification batch.");
  }

  for (const reportId of uniqueReturnedIds) {
    if (!expectedReportIds.has(reportId)) {
      throw new Error("Gemini returned a reportId outside the requested batch.");
    }
  }
};

const fetchPendingReports = async (limit) => {
  return prisma.report.findMany({
    where: {
      processingStatus: "PREPROCESSED",
      cleanedSubject: { not: null },
      classification: { is: null },
    },
    select: {
      id: true,
      ftirNumber: true,
      vehicleModel: true,
      cleanedSubject: true,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
};

const requestClassificationFromGemini = async ({ reports, batchId }) => {
  const prompt = buildClassificationPrompt(reports);

  for (let index = 0; index < geminiConfig.models.length; index += 1) {
    const modelName = geminiConfig.models[index];
    const attemptNumber = index + 1;
    const startedAt = Date.now();

    try {
      const response = await geminiClient.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: CLASSIFICATION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: classificationResponseJsonSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim();

      if (!responseText) {
        throw new Error("Gemini returned an empty classification response.");
      }

      const parsedResponse = classificationResponseSchema.parse(
        JSON.parse(responseText),
      );

      validateModelResults(parsedResponse.classifications, reports);

      return {
        modelName,
        attemptNumber,
        responseTimeMs: Date.now() - startedAt,
        usage: getUsageValues(response.usageMetadata),
        classifications: parsedResponse.classifications,
      };
    } catch (error) {
      const errorDetails = getErrorDetails(error);

      await prisma.aiUsageLog.create({
        data: {
          batchId,
          provider: "GEMINI",
          modelName,
          operation: "CLASSIFICATION",
          attemptNumber,
          reportCount: reports.length,
          responseTimeMs: Date.now() - startedAt,
          status: errorDetails.isRateLimited ? "RATE_LIMITED" : "FAILED",
          errorCode: errorDetails.errorCode,
          errorMessage: errorDetails.errorMessage,
        },
      });
    }
  }

  throw new Error(
    "Classification failed: every configured Gemini model attempt failed.",
  );
};

const saveClassificationBatch = async ({
  reports,
  batchId,
  modelName,
  attemptNumber,
  responseTimeMs,
  usage,
  classifications,
}) => {
  const reportById = new Map(reports.map((report) => [report.id, report]));

  await prisma.$transaction(async (transaction) => {
    for (const classification of classifications) {
      const report = reportById.get(classification.reportId);
      const reviewRequired =
        classification.confidenceScore < geminiConfig.lowConfidenceThreshold;

      await transaction.classification.create({
        data: {
          reportId: report.id,
          label: classification.label,
          confidenceScore: classification.confidenceScore,
          reason: classification.reason,
          modelName,
          rawAiResponse: classification,
          promptVersion: geminiConfig.promptVersion,
          reviewRequired,
          reviewReason: reviewRequired
            ? `AI confidence score ${classification.confidenceScore} is below the ${geminiConfig.lowConfidenceThreshold} review threshold.`
            : null,
        },
      });

      await transaction.report.update({
        where: { id: report.id },
        data: {
          processingStatus: "CLASSIFIED",
          processingError: null,
        },
      });

      await transaction.auditLog.create({
        data: {
          reportId: report.id,
          action: "REPORT_CLASSIFIED",
          entityType: "Classification",
          entityId: report.id,
          details: {
            ftirNumber: report.ftirNumber,
            label: classification.label,
            confidenceScore: classification.confidenceScore,
            modelName,
            promptVersion: geminiConfig.promptVersion,
            reviewRequired,
          },
          performedBy: "GEMINI_CLASSIFICATION_SERVICE",
        },
      });
    }

    await transaction.aiUsageLog.create({
      data: {
        batchId,
        provider: "GEMINI",
        modelName,
        operation: "CLASSIFICATION",
        attemptNumber,
        reportCount: reports.length,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        responseTimeMs,
        status: "SUCCESS",
      },
    });
  });
};

export const runClassificationBatch = async (requestedLimit) => {
  const reports = await fetchPendingReports(getSafeBatchSize(requestedLimit));

  if (reports.length === 0) {
    return {
      batchId: null,
      message: "No PREPROCESSED reports are waiting for classification.",
      processedCount: 0,
      modelName: null,
      lowConfidenceCount: 0,
    };
  }

  const batchId = crypto.randomUUID();
  const modelResult = await requestClassificationFromGemini({
    reports,
    batchId,
  });

  await saveClassificationBatch({
    reports,
    batchId,
    ...modelResult,
  });

  const lowConfidenceCount = modelResult.classifications.filter(
    (classification) =>
      classification.confidenceScore < geminiConfig.lowConfidenceThreshold,
  ).length;

  return {
    batchId,
    message: "Classification batch completed successfully.",
    processedCount: reports.length,
    modelName: modelResult.modelName,
    lowConfidenceCount,
  };
};

export const runAllPendingClassifications = async (requestedBatchSize) => {
  const batchSize = getSafeBatchSize(requestedBatchSize);
  let processedCount = 0;
  let lowConfidenceCount = 0;
  let batchCount = 0;
  const modelsUsed = new Set();

  while (true) {
    const batchResult = await runClassificationBatch(batchSize);

    if (batchResult.processedCount === 0) {
      break;
    }

    processedCount += batchResult.processedCount;
    lowConfidenceCount += batchResult.lowConfidenceCount;
    batchCount += 1;
    modelsUsed.add(batchResult.modelName);
  }

  return {
    message:
      processedCount === 0
        ? "No PREPROCESSED reports are waiting for classification."
        : "All currently pending reports were classified successfully.",
    processedCount,
    lowConfidenceCount,
    batchCount,
    batchSize,
    modelsUsed: [...modelsUsed],
  };
};

export const getClassificationSummary = async () => {
  const [totalReports, pendingCount, reviewRequiredCount, groupedClassifications] =
    await Promise.all([
      prisma.report.count(),
      prisma.report.count({
        where: {
          processingStatus: "PREPROCESSED",
          cleanedSubject: { not: null },
          classification: { is: null },
        },
      }),
      prisma.classification.count({
        where: { reviewRequired: true },
      }),
      prisma.classification.groupBy({
        by: ["label"],
        _count: { _all: true },
      }),
    ]);

  const totals = {
    cybersecurity: 0,
    nonCybersecurity: 0,
  };

  for (const group of groupedClassifications) {
    if (group.label === "CYBERSECURITY") {
      totals.cybersecurity = group._count._all;
    }

    if (group.label === "NON_CYBERSECURITY") {
      totals.nonCybersecurity = group._count._all;
    }
  }

  return {
    totalReports,
    pendingCount,
    classifiedCount: totals.cybersecurity + totals.nonCybersecurity,
    cybersecurityCount: totals.cybersecurity,
    nonCybersecurityCount: totals.nonCybersecurity,
    reviewRequiredCount,
  };
};

export const getReportsByClassificationLabel = async ({ label, page, limit }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(
    Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );

  const where = {
    classification: {
      is: { label },
    },
  };

  const [totalItems, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      select: {
        id: true,
        ftirNumber: true,
        vehicleModel: true,
        mileage: true,
        registrationDate: true,
        ftirReportDate: true,
        incidentDate: true,
        cleanedSubject: true,
        processingStatus: true,
        classification: {
          select: {
            label: true,
            confidenceScore: true,
            reason: true,
            modelName: true,
            classifiedAt: true,
            reviewRequired: true,
            reviewReason: true,
          },
        },
      },
      orderBy: {
        classification: {
          classifiedAt: "desc",
        },
      },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
  ]);

  return {
    reports,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / safeLimit),
      hasNextPage: safePage * safeLimit < totalItems,
      hasPreviousPage: safePage > 1,
    },
  };
};
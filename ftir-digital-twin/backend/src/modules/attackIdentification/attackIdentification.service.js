import crypto from "node:crypto";
import prisma from "../../config/database.js";
import { geminiClient, geminiConfig } from "../../config/gemini.config.js";
import {
  ATTACK_CODES,
  attackIdentificationResponseJsonSchema,
  attackIdentificationResponseSchema,
} from "./attackIdentification.schema.js";
import {
  ATTACK_IDENTIFICATION_SYSTEM_INSTRUCTION,
  buildAttackIdentificationPrompt,
} from "./attackIdentification.prompt.js";

const MAX_BATCH_SIZE = 10;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const safeBatchSize = (value) => Math.min(Math.max(Number(value) || geminiConfig.attackIdentificationBatchSize, 1), MAX_BATCH_SIZE);

const errorDetails = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const code = error?.status ?? error?.code ?? null;
  return {
    errorCode: code ? String(code) : null,
    errorMessage: message.slice(0, 2000),
    rateLimited: Number(code) === 429 || /429|rate limit|resource exhausted|quota/i.test(message),
  };
};

const usage = (metadata = {}) => ({
  inputTokens: metadata.promptTokenCount ?? null,
  outputTokens: metadata.candidatesTokenCount ?? null,
  totalTokens: metadata.totalTokenCount ?? null,
});

const getEligibleReports = (take) => prisma.report.findMany({
  where: {
    processingStatus: "CLASSIFIED",
    cleanedSubject: { not: null },
    classification: { is: { label: "CYBERSECURITY", reviewRequired: false } },
    attackProfile: { is: null },
  },
  select: { id: true, ftirNumber: true, vehicleModel: true, cleanedSubject: true, sourceType: true },
  orderBy: { createdAt: "asc" },
  take,
});

const validateBatch = (profiles, reports) => {
  const expected = new Set(reports.map((report) => report.id));
  const received = profiles.map((profile) => profile.reportId);
  const unique = new Set(received);
  if (unique.size !== received.length || unique.size !== expected.size) {
    throw new Error("Gemini returned duplicate or incomplete attack profiles.");
  }
  for (const id of unique) if (!expected.has(id)) throw new Error("Gemini returned an unknown reportId.");
  for (const profile of profiles) {
    const expectedStatus = profile.attackCode === "UNCLASSIFIED" ? "UNCLASSIFIED" : "IDENTIFIED";
    if (profile.identificationStatus !== expectedStatus) {
      throw new Error("Gemini returned an inconsistent attack code and identification status.");
    }
  }
};

const callGemini = async ({ reports, batchId }) => {
  const contents = buildAttackIdentificationPrompt(reports);
  for (let index = 0; index < geminiConfig.models.length; index += 1) {
    const modelName = geminiConfig.models[index];
    const attemptNumber = index + 1;
    const startedAt = Date.now();
    try {
      const response = await geminiClient.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: ATTACK_IDENTIFICATION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: attackIdentificationResponseJsonSchema,
          temperature: 0.1,
        },
      });
      if (!response.text?.trim()) throw new Error("Gemini returned an empty attack-identification response.");
      const parsed = attackIdentificationResponseSchema.parse(JSON.parse(response.text));
      validateBatch(parsed.attackProfiles, reports);
      return { modelName, attemptNumber, responseTimeMs: Date.now() - startedAt, usage: usage(response.usageMetadata), profiles: parsed.attackProfiles };
    } catch (error) {
      console.error(`Attack-identification attempt failed for ${modelName}:`, error);
      const details = errorDetails(error);
      await prisma.aiUsageLog.create({
        data: {
          batchId, provider: "GEMINI", modelName, operation: "ATTACK_IDENTIFICATION",
          attemptNumber, reportCount: reports.length, responseTimeMs: Date.now() - startedAt,
          status: details.rateLimited ? "RATE_LIMITED" : "FAILED",
          errorCode: details.errorCode, errorMessage: details.errorMessage,
        },
      });
    }
  }
  throw new Error("Attack identification failed: every configured Gemini model attempt failed.");
};

const saveProfiles = async ({ reports, batchId, modelName, attemptNumber, responseTimeMs, usage: tokenUsage, profiles }) => {
  const reportsById = new Map(reports.map((report) => [report.id, report]));
  const attackTypes = await prisma.attackType.findMany({ where: { code: { in: ATTACK_CODES }, isActive: true }, select: { id: true, code: true } });
  const attackTypeByCode = new Map(attackTypes.map((type) => [type.code, type]));
  if (attackTypeByCode.size !== ATTACK_CODES.length) throw new Error("AttackType seed data is incomplete. Seed all six attack types first.");

  await prisma.$transaction(async (tx) => {
    for (const profile of profiles) {
      const report = reportsById.get(profile.reportId);
      const lowConfidence = profile.confidenceScore < geminiConfig.attackIdentificationLowConfidenceThreshold;
      const finalStatus = profile.attackCode === "UNCLASSIFIED" || lowConfidence ? "UNCLASSIFIED" : "IDENTIFIED";
      const finalCode = finalStatus === "UNCLASSIFIED" ? "UNCLASSIFIED" : profile.attackCode;
      await tx.attackProfile.create({
        data: {
          reportId: report.id,
          attackTypeId: attackTypeByCode.get(finalCode).id,
          rootCause: profile.rootCause,
          attackDescription: profile.attackDescription,
          simulationParameters: {
            scenario: profile.simulationParameters.scenario,
            durationSeconds: profile.simulationParameters.durationSeconds,
            expectedEffects: profile.simulationParameters.expectedEffects,
            targetedEcus: profile.targetedEcus,
            reason: profile.reason,
            predictedAttackCode: profile.attackCode,
            modelIdentificationStatus: profile.identificationStatus,
            lowConfidence,
          },
          confidenceScore: profile.confidenceScore,
          identificationStatus: finalStatus,
          rawAiResponse: profile,
        },
      });
      await tx.report.update({ where: { id: report.id }, data: { processingStatus: "ATTACK_IDENTIFIED", processingError: null } });
      await tx.auditLog.create({
        data: {
          reportId: report.id,
          action: finalStatus === "IDENTIFIED" ? "ATTACK_IDENTIFIED" : "ATTACK_UNCLASSIFIED",
          entityType: "AttackProfile", entityId: report.id,
          details: { ftirNumber: report.ftirNumber, attackCode: finalCode, confidenceScore: profile.confidenceScore, modelName, promptVersion: geminiConfig.attackIdentificationPromptVersion },
          performedBy: "GEMINI_ATTACK_IDENTIFICATION_SERVICE",
        },
      });
    }
    await tx.aiUsageLog.create({
      data: {
        batchId, provider: "GEMINI", modelName, operation: "ATTACK_IDENTIFICATION", attemptNumber,
        reportCount: reports.length, inputTokens: tokenUsage.inputTokens, outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens, responseTimeMs, status: "SUCCESS",
      },
    });
  });
};

export const runAttackIdentificationBatch = async (requestedBatchSize) => {
  const reports = await getEligibleReports(safeBatchSize(requestedBatchSize));
  if (!reports.length) return { batchId: null, message: "No eligible Cybersecurity reports are waiting for attack identification.", processedCount: 0, identifiedCount: 0, unclassifiedCount: 0 };
  const batchId = crypto.randomUUID();
  const result = await callGemini({ reports, batchId });
  await saveProfiles({ reports, batchId, ...result });
  const unclassifiedCount = result.profiles.filter((profile) => profile.attackCode === "UNCLASSIFIED" || profile.confidenceScore < geminiConfig.attackIdentificationLowConfidenceThreshold).length;
  return { batchId, message: "Attack-identification batch completed successfully.", processedCount: reports.length, modelName: result.modelName, identifiedCount: reports.length - unclassifiedCount, unclassifiedCount };
};

export const runAllAttackIdentification = async (requestedBatchSize) => {
  const batchSize = safeBatchSize(requestedBatchSize);
  let processedCount = 0, identifiedCount = 0, unclassifiedCount = 0, batchCount = 0;
  const modelsUsed = new Set();
  while (true) {
    const result = await runAttackIdentificationBatch(batchSize);
    if (!result.processedCount) break;
    processedCount += result.processedCount;
    identifiedCount += result.identifiedCount;
    unclassifiedCount += result.unclassifiedCount;
    batchCount += 1;
    modelsUsed.add(result.modelName);
  }
  return { message: processedCount ? "All eligible Cybersecurity reports were processed." : "No eligible Cybersecurity reports are waiting for attack identification.", processedCount, identifiedCount, unclassifiedCount, batchCount, batchSize, modelsUsed: [...modelsUsed] };
};

export const getAttackIdentificationSummary = async () => {
  const [eligibleCount, groupedStatus, groupedAttackType] = await Promise.all([
    prisma.report.count({ where: { processingStatus: "CLASSIFIED", classification: { is: { label: "CYBERSECURITY", reviewRequired: false } }, attackProfile: { is: null } } }),
    prisma.attackProfile.groupBy({ by: ["identificationStatus"], _count: { _all: true } }),
    prisma.attackProfile.groupBy({ by: ["attackTypeId"], _count: { _all: true } }),
  ]);
  const attackTypes = await prisma.attackType.findMany({ where: { id: { in: groupedAttackType.map((item) => item.attackTypeId) } }, select: { id: true, code: true, name: true } });
  const typesById = new Map(attackTypes.map((type) => [type.id, type]));
  const countsByStatus = Object.fromEntries(groupedStatus.map((item) => [item.identificationStatus, item._count._all]));
  return {
    eligibleCount,
    identifiedCount: countsByStatus.IDENTIFIED ?? 0,
    unclassifiedCount: countsByStatus.UNCLASSIFIED ?? 0,
    byAttackType: groupedAttackType.map((item) => ({ attackType: typesById.get(item.attackTypeId), count: item._count._all })),
  };
};

export const listAttackProfiles = async ({ identificationStatus, page, limit }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const where = identificationStatus ? { identificationStatus } : {};
  const [totalItems, profiles] = await Promise.all([
    prisma.attackProfile.count({ where }),
    prisma.attackProfile.findMany({
      where, skip: (safePage - 1) * safeLimit, take: safeLimit, orderBy: { identifiedAt: "desc" },
      include: {
        attackType: { select: { code: true, name: true, description: true } },
        report: { select: { id: true, ftirNumber: true, vehicleModel: true, cleanedSubject: true, sourceType: true, classification: { select: { confidenceScore: true, reason: true } } } },
      },
    }),
  ]);
  return { profiles, pagination: { page: safePage, limit: safeLimit, totalItems, totalPages: Math.ceil(totalItems / safeLimit), hasNextPage: safePage * safeLimit < totalItems, hasPreviousPage: safePage > 1 } };
};

export const getAttackProfileByReportId = async (reportId) => {
  const profile = await prisma.attackProfile.findUnique({
    where: { reportId },
    include: { attackType: true, report: { include: { classification: true } }, simulationRuns: true },
  });
  if (!profile) {
    const error = new Error("Attack profile not found for this report.");
    error.statusCode = 404;
    throw error;
  }
  return profile;
};
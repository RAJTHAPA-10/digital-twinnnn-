import prisma from "../../config/database.js";
import { buildFinalReport } from "./core/reportGenerator.js";
import { createReport, getReportById, getReportByImpactId, listReports } from "./core/reportStore.js";
import { getImpactAnalysis } from "../impactAnalysis/impact.service.js";
import { getSimulationRun } from "../digitalTwin/simulation.service.js";
import { buildPipelineData } from "./core/reportData.js";
import { buildTemplateReport, writePlainReport } from "./core/llmReportWriter.js";

export class ImpactAnalysisNotFoundError extends Error {
  constructor(impactId) {
    super(`Impact analysis ${impactId} was not found.`);
    this.name = "ImpactAnalysisNotFoundError";
  }
}


const inflight = new Map();


const loadIncidentContext = async (ftirNumber) => {
  if (!ftirNumber) return null;

  try {
    const report = await prisma.report.findUnique({
      where: { ftirNumber },
      select: {
        ftirNumber: true,
        vehicleModel: true,
        cleanedSubject: true,
        mileage: true,
        incidentDate: true,
        ftirReportDate: true,
        classification: {
          select: { label: true, confidenceScore: true, reason: true, reviewRequired: true },
        },
        attackProfile: {
          select: {
            rootCause: true,
            attackDescription: true,
            confidenceScore: true,
            attackType: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!report) return null;

    return {
      ftirNumber: report.ftirNumber,
      vehicleModel: report.vehicleModel,
      subject: report.cleanedSubject,
      mileage: report.mileage,
      incidentDate: report.incidentDate,
      ftirReportDate: report.ftirReportDate,
      classification: report.classification,
      identifiedAttack: report.attackProfile
        ? {
            code: report.attackProfile.attackType?.code ?? null,
            name: report.attackProfile.attackType?.name ?? null,
            rootCause: report.attackProfile.rootCause,
            description: report.attackProfile.attackDescription,
            confidenceScore: report.attackProfile.confidenceScore,
          }
        : null,
    };
  } catch (error) {
    console.warn(`[recommendations] Could not load FTIR context for ${ftirNumber}: ${error.message}`);
    return null;
  }
};

const buildAndStore = async (impactId, ftirNumber) => {
  const impactRecord = getImpactAnalysis(impactId);

  if (!impactRecord) {
    throw new ImpactAnalysisNotFoundError(impactId);
  }

  if (impactRecord.status !== "COMPLETED") {
    throw new Error(`Impact analysis ${impactId} is not completed.`);
  }

  const incidentContext = await loadIncidentContext(ftirNumber);
  const reportContent = await buildFinalReport(impactRecord, incidentContext);


  const pipelineData = buildPipelineData({
    impactRecord,
    simulationRun: getSimulationRun(impactRecord.simulationRunId),
    incidentContext,
    recommendationResult: {
      summary: reportContent.recommendationSummary,
      recommendations: reportContent.recommendations,
    },
  });
  reportContent.plainReport =
    process.env.PLAIN_REPORT_LLM_ENABLED === "false"
      ? buildTemplateReport(pipelineData)
      : await writePlainReport(pipelineData);

  return createReport({
    impactId,
    attackType: impactRecord.analysis.attackType,
    severity: impactRecord.analysis.severity,
    severityScore: impactRecord.analysis.severityScore,
    riskLevel: impactRecord.analysis.riskLevel,
    affectedEcus: impactRecord.analysis.affectedEcus,
    content: reportContent
  });
};

export const createFinalReport = async (impactId, ftirNumber = null) => {
  
  const existing = getReportByImpactId(impactId);
  if (existing) {
    return structuredClone(existing);
  }

  if (inflight.has(impactId)) {
    return inflight.get(impactId);
  }

  const promise = buildAndStore(impactId, ftirNumber).finally(() => inflight.delete(impactId));
  inflight.set(impactId, promise);
  return promise;
};

export const getReport = (reportId) => {
  const report = getReportById(reportId);
  if (!report) {
    throw new Error(`Report ${reportId} not found.`);
  }
  return report;
};

export const getAllReports = () => {
  return listReports();
};
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('COMPANY', 'SYNTHETIC');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('UPLOADED', 'PREPROCESSED', 'CLASSIFIED', 'ATTACK_IDENTIFIED', 'SIMULATED', 'ANALYSED', 'REPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClassificationLabel" AS ENUM ('CYBERSECURITY', 'NON_CYBERSECURITY');

-- CreateEnum
CREATE TYPE "AttackIdentificationStatus" AS ENUM ('IDENTIFIED', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REPORT_UPLOADED', 'REPORT_PREPROCESSED', 'REPORT_CLASSIFIED', 'CLASSIFICATION_OVERRIDDEN', 'ATTACK_IDENTIFIED', 'ATTACK_UNCLASSIFIED', 'SIMULATION_STARTED', 'SIMULATION_COMPLETED', 'SIMULATION_FAILED', 'IMPACT_ANALYSED', 'RECOMMENDATIONS_GENERATED', 'FINAL_REPORT_GENERATED', 'FINAL_REPORT_EXPORTED');

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "ftirNumber" TEXT NOT NULL,
    "vehicleModel" TEXT,
    "mileage" INTEGER,
    "rawRegistrationDate" TEXT,
    "registrationDate" TIMESTAMP(3),
    "rawFtirReportDate" TEXT,
    "ftirReportDate" TIMESTAMP(3),
    "rawIncidentDate" TEXT,
    "incidentDate" TIMESTAMP(3),
    "rawSubject" TEXT NOT NULL,
    "cleanedSubject" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'COMPANY',
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "label" "ClassificationLabel" NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "modelName" TEXT,
    "rawAiResponse" JSONB,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationOverride" (
    "id" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,
    "previousLabel" "ClassificationLabel" NOT NULL,
    "correctedLabel" "ClassificationLabel" NOT NULL,
    "overrideReason" TEXT NOT NULL,
    "overriddenBy" TEXT,
    "overriddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttackType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackProfile" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "attackTypeId" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "attackDescription" TEXT NOT NULL,
    "simulationParameters" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "identificationStatus" "AttackIdentificationStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "rawAiResponse" JSONB,
    "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttackProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "attackProfileId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "SimulationStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "configuration" JSONB,
    "simulationLogs" JSONB,
    "observationSummary" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcuImpact" (
    "id" TEXT NOT NULL,
    "simulationRunId" TEXT NOT NULL,
    "ecuName" TEXT NOT NULL,
    "impactType" TEXT NOT NULL,
    "impactDescription" TEXT NOT NULL,
    "initialState" TEXT,
    "finalState" TEXT,
    "isDirectlyTargeted" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcuImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactAssessment" (
    "id" TEXT NOT NULL,
    "simulationRunId" TEXT NOT NULL,
    "severityLevel" "SeverityLevel" NOT NULL,
    "severityScore" INTEGER NOT NULL,
    "vehicleImpact" TEXT NOT NULL,
    "riskAnalysis" TEXT NOT NULL,
    "propagationPath" JSONB,
    "analysedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mitigation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mitigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "impactAssessmentId" TEXT NOT NULL,
    "mitigationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalReport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "impactAssessmentId" TEXT NOT NULL,
    "content" JSONB,
    "pdfFileName" TEXT,
    "pdfFilePath" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedAt" TIMESTAMP(3),

    CONSTRAINT "FinalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_ftirNumber_key" ON "Report"("ftirNumber");

-- CreateIndex
CREATE INDEX "Report_processingStatus_idx" ON "Report"("processingStatus");

-- CreateIndex
CREATE INDEX "Report_vehicleModel_idx" ON "Report"("vehicleModel");

-- CreateIndex
CREATE INDEX "Report_sourceType_idx" ON "Report"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_reportId_key" ON "Classification"("reportId");

-- CreateIndex
CREATE INDEX "Classification_label_idx" ON "Classification"("label");

-- CreateIndex
CREATE INDEX "ClassificationOverride_classificationId_idx" ON "ClassificationOverride"("classificationId");

-- CreateIndex
CREATE UNIQUE INDEX "AttackType_code_key" ON "AttackType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AttackProfile_reportId_key" ON "AttackProfile"("reportId");

-- CreateIndex
CREATE INDEX "AttackProfile_attackTypeId_idx" ON "AttackProfile"("attackTypeId");

-- CreateIndex
CREATE INDEX "AttackProfile_identificationStatus_idx" ON "AttackProfile"("identificationStatus");

-- CreateIndex
CREATE INDEX "SimulationRun_status_idx" ON "SimulationRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationRun_attackProfileId_runNumber_key" ON "SimulationRun"("attackProfileId", "runNumber");

-- CreateIndex
CREATE INDEX "EcuImpact_simulationRunId_idx" ON "EcuImpact"("simulationRunId");

-- CreateIndex
CREATE INDEX "EcuImpact_ecuName_idx" ON "EcuImpact"("ecuName");

-- CreateIndex
CREATE UNIQUE INDEX "ImpactAssessment_simulationRunId_key" ON "ImpactAssessment"("simulationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Mitigation_code_key" ON "Mitigation"("code");

-- CreateIndex
CREATE INDEX "Recommendation_impactAssessmentId_idx" ON "Recommendation"("impactAssessmentId");

-- CreateIndex
CREATE INDEX "Recommendation_mitigationId_idx" ON "Recommendation"("mitigationId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalReport_reportId_key" ON "FinalReport"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalReport_impactAssessmentId_key" ON "FinalReport"("impactAssessmentId");

-- CreateIndex
CREATE INDEX "AuditLog_reportId_idx" ON "AuditLog"("reportId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationOverride" ADD CONSTRAINT "ClassificationOverride_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttackProfile" ADD CONSTRAINT "AttackProfile_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttackProfile" ADD CONSTRAINT "AttackProfile_attackTypeId_fkey" FOREIGN KEY ("attackTypeId") REFERENCES "AttackType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_attackProfileId_fkey" FOREIGN KEY ("attackProfileId") REFERENCES "AttackProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcuImpact" ADD CONSTRAINT "EcuImpact_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "SimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactAssessment" ADD CONSTRAINT "ImpactAssessment_simulationRunId_fkey" FOREIGN KEY ("simulationRunId") REFERENCES "SimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_impactAssessmentId_fkey" FOREIGN KEY ("impactAssessmentId") REFERENCES "ImpactAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_mitigationId_fkey" FOREIGN KEY ("mitigationId") REFERENCES "Mitigation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalReport" ADD CONSTRAINT "FinalReport_impactAssessmentId_fkey" FOREIGN KEY ("impactAssessmentId") REFERENCES "ImpactAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

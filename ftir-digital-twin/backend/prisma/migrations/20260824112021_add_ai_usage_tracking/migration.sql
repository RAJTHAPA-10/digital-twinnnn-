-- CreateEnum
CREATE TYPE "AiOperation" AS ENUM ('CLASSIFICATION', 'ATTACK_IDENTIFICATION');

-- CreateEnum
CREATE TYPE "AiRequestStatus" AS ENUM ('SUCCESS', 'RATE_LIMITED', 'FAILED');

-- AlterTable
ALTER TABLE "Classification" ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "reviewRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "reportId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'GEMINI',
    "modelName" TEXT NOT NULL,
    "operation" "AiOperation" NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "responseTimeMs" INTEGER,
    "status" "AiRequestStatus" NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageLog_batchId_idx" ON "AiUsageLog"("batchId");

-- CreateIndex
CREATE INDEX "AiUsageLog_reportId_idx" ON "AiUsageLog"("reportId");

-- CreateIndex
CREATE INDEX "AiUsageLog_modelName_idx" ON "AiUsageLog"("modelName");

-- CreateIndex
CREATE INDEX "AiUsageLog_operation_idx" ON "AiUsageLog"("operation");

-- CreateIndex
CREATE INDEX "AiUsageLog_status_idx" ON "AiUsageLog"("status");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "Classification_reviewRequired_idx" ON "Classification"("reviewRequired");

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

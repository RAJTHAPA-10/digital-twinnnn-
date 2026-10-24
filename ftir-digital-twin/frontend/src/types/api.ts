export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export type ProcessingStatus =
  | "UPLOADED"
  | "PREPROCESSED"
  | "CLASSIFIED"
  | "ATTACK_IDENTIFIED"
  | "SIMULATED"
  | "ANALYSED"
  | "REPORTED"
  | "FAILED";

export type SourceType = "COMPANY" | "SYNTHETIC";
export type ClassificationLabel = "CYBERSECURITY" | "NON_CYBERSECURITY";

export type AttackCode =
  | "GPS_SPOOFING"
  | "CAN_MESSAGE_INJECTION"
  | "REPLAY_ATTACK"
  | "DENIAL_OF_SERVICE"
  | "SENSOR_SPOOFING"
  | "UNCLASSIFIED";

export type ScenarioType = Exclude<AttackCode, "UNCLASSIFIED">;
export const SCENARIO_TYPES: ScenarioType[] = [
  "GPS_SPOOFING",
  "CAN_MESSAGE_INJECTION",
  "REPLAY_ATTACK",
  "DENIAL_OF_SERVICE",
  "SENSOR_SPOOFING",
];

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EventSeverity = "INFO" | Severity;

export interface Report {
  id: string;
  ftirNumber: string;
  vehicleModel: string | null;
  mileage: number | null;
  rawRegistrationDate?: string | null;
  registrationDate: string | null;
  rawFtirReportDate?: string | null;
  ftirReportDate: string | null;
  rawIncidentDate?: string | null;
  incidentDate: string | null;
  rawSubject?: string;
  cleanedSubject: string | null;
  sourceType: SourceType;
  processingStatus: ProcessingStatus;
  processingError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationFtir {
  page: number;
  limit: number;
  totalReports: number;
  totalPages: number;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ReportList {
  reports: Report[];
  pagination: PaginationFtir;
  filters: { processingStatus: ProcessingStatus | null; vehicleModel: string | null };
}

export interface ReportListParams {
  page?: number;
  limit?: number;
  status?: ProcessingStatus | "";
  model?: string;
}

export interface FtirStats {
  totalReports: number;
  uploadedReports: number;
  preprocessedReports: number;
  classifiedReports: number;
  attackIdentifiedReports: number;
  simulatedReports: number;
  analysedReports: number;
  reportedReports: number;
  failedReports: number;
}

export interface UploadResult {
  fileName: string;
  validReports: number;
  [key: string]: unknown;
}

export interface Classification {
  label: ClassificationLabel;
  confidenceScore: number | null;
  reason: string;
  modelName: string | null;
  classifiedAt: string;
  reviewRequired: boolean;
  reviewReason: string | null;
}

export interface ClassifiedReport {
  id: string;
  ftirNumber: string;
  vehicleModel: string | null;
  mileage: number | null;
  registrationDate: string | null;
  ftirReportDate: string | null;
  incidentDate: string | null;
  cleanedSubject: string | null;
  processingStatus: ProcessingStatus;
  classification: Classification;
}

export interface ClassifiedList {
  reports: ClassifiedReport[];
  pagination: Pagination;
}

export interface ClassificationSummary {
  totalReports: number;
  pendingCount: number;
  classifiedCount: number;
  cybersecurityCount: number;
  nonCybersecurityCount: number;
  reviewRequiredCount: number;
}

export interface RunResult {
  message?: string;
  processedCount?: number;
  [key: string]: unknown;
}

export interface SimulationParameters {
  scenario: string;
  durationSeconds: number;
  expectedEffects: string[];
  // Saved by the backend's attack-identification step (saveProfiles):
  targetedEcus?: string[];
  reason?: string;
  predictedAttackCode?: AttackCode;
  modelIdentificationStatus?: "IDENTIFIED" | "UNCLASSIFIED";
  lowConfidence?: boolean;
}

export interface AttackProfile {
  id: string;
  reportId: string;
  rootCause: string;
  attackDescription: string;
  confidenceScore: number | null;
  identificationStatus: "IDENTIFIED" | "UNCLASSIFIED";
  simulationParameters: SimulationParameters | null;
  rawAiResponse: unknown;
  identifiedAt: string;
  attackType: { code: AttackCode; name: string; description?: string | null };
  report: {
    id: string;
    ftirNumber: string;
    vehicleModel: string | null;
    cleanedSubject: string | null;
    sourceType: SourceType;
    classification: { confidenceScore: number | null; reason: string } | null;
  };
}

export interface AttackProfileList {
  profiles: AttackProfile[];
  pagination: Pagination;
}

export interface AttackSummary {
  eligibleCount: number;
  identifiedCount: number;
  unclassifiedCount: number;
  byAttackType: { attackType: { id: string; code: AttackCode; name: string } | undefined; count: number }[];
}

// ---------- Digital twin ----------

export interface SimulationRequest {
  scenarioType: ScenarioType;
  durationMs?: number;
  tickIntervalMs?: number;
  scenarioConfig?: Record<string, unknown>;
}

export interface SimEvent {
  sequence: number;
  timeMs: number;
  eventType: string;
  sourceEcu: string | null;
  targetEcu: string | null;
  message: string;
  severity: EventSeverity;
  isAnomalous: boolean;
  data: Record<string, unknown> | null;
}

export interface EcuState {
  status: "NORMAL" | "AFFECTED" | string;
  directlyTargeted: boolean;
  [key: string]: unknown;
}

export interface VehicleState {
  simulation: { tick: number; timeMs: number; status: string };
  vehicle: { speedKph: number; engineRunning: boolean; drivingMode: string };
  network: {
    healthScore: number;
    messageCount: number;
    delayedMessageCount: number;
    droppedMessageCount: number;
    replayedMessageCount: number;
    unauthorisedMessageCount: number;
  };
  ecus: Record<string, EcuState>;
  sensors: { frontObstacleDistanceM: number; laneConfidence: number; speedSensorKph: number; sensorTrusted: boolean };
  alerts: { timeMs: number; level: string; source: string; message: string }[];
  anomalies: { timeMs: number; severity: string; source: string; type: string; message: string }[];
}

export interface SimulationResult {
  scenarioType: ScenarioType;
  scenarioName: string;
  clock: { tick: number; timeMs: number; durationMs: number; tickIntervalMs: number; progressPercentage: number; isComplete: boolean };
  vehicleState: VehicleState;
  events: SimEvent[];
  anomalies: SimEvent[];
  summary: {
    totalEvents: number;
    anomalyCount: number;
    severityCounts: Record<EventSeverity, number>;
    firstEventTimeMs: number | null;
    lastEventTimeMs: number | null;
  };
}

export interface SimulationRun {
  runId: string;
  status: string;
  startedAt: string;
  completedAt: string;
  input: Required<SimulationRequest>;
  result: SimulationResult;
}

// ---------- Impact ----------

export interface ImpactAnalysis {
  attackType: ScenarioType;
  affectedEcus: string[];
  directlyTargetedEcus: string[];
  vehicleImpact: string[];
  networkImpact: string[];
  severity: Severity;
  severityScore: number;
  riskLevel: Severity;
  severityReasons: string[];
  propagationPath: string[];
  propagationLinks: { source: string; target: string }[];
  propagationDisplayPath: string;
  observedPropagationEvents: { timeMs: number; eventType: string; sourceEcu: string | null; targetEcu: string | null; severity: string }[];
  evidence: { alertCount: number; anomalyCount: number; affectedEcuCount: number; networkHealthScore: number | null };
  summary: string;
  disclaimer: string;
}

export interface ImpactRecord {
  impactId: string;
  status: string;
  createdAt: string;
  simulationRunId: string;
  analysis: ImpactAnalysis;
}


export type RecommendationCategory = "PREVENTION" | "DETECTION" | "RESPONSE" | "RECOVERY";

export interface BackendRecommendation {
  id?: string;
  title: string;
  priority: Severity;
  description: string;
  category?: RecommendationCategory;
  targetEcus?: string[];
  rationale?: string;
  standardReference?: string | null;
  [key: string]: unknown;
}

export interface RecommendationSource {
  source: "AI" | "CATALOGUE";
  modelName?: string;
  promptVersion?: string;
  responseTimeMs?: number;
  totalTokens?: number | null;
  reason?: string;
}

export interface PlainReport {
  source: "AI" | "TEMPLATE";
  modelName?: string;
  summary: string;
  sections: { key: string; heading: string; body: string }[];
}

export interface FinalReportContent {
  title: string;
  executiveSummary: string;
  incidentDetails: { impactId: string; simulationRunId: string; attackType: string; createdAt: string };
  impactAssessment: {
    affectedEcus: string[];
    vehicleImpact: string[];
    networkImpact: string[];
    severity: Severity;
    severityScore: number;
    riskLevel: Severity;
    propagationPath: string[];
  };
  rootCauseSummary: string;
  recommendations: BackendRecommendation[];
  recommendationSummary?: string | null;
  recommendationSource?: RecommendationSource;
  plainReport?: PlainReport; // NEW
  disclaimer: string;
}

export interface FinalReport {
  reportId: string;
  createdAt: string;
  status: string;
  impactId: string;
  attackType: string;
  severity: Severity;
  severityScore: number;
  riskLevel: Severity;
  affectedEcus: string[];
  content: FinalReportContent;
}

// ---------- Frontend-only ----------

export type EvidenceStrength = "Strong" | "High" | "Medium";

export interface Explanation {
  verdict: string;
  isCyber: boolean;
  confidence: number | null;
  explanation: string;
  text: string;
  evidence: { phrase: string; strength: EvidenceStrength; indicator: string }[];
}

export interface Api {
  health(): Promise<boolean>;
  listReports(params: ReportListParams): Promise<ReportList>;
  getReport(ftirNumber: string): Promise<Report>;
  getStats(): Promise<FtirStats>;
  uploadCsv(file: File): Promise<UploadResult>;

  classificationSummary(): Promise<ClassificationSummary>;
  listClassified(label: ClassificationLabel, page: number, limit: number): Promise<ClassifiedList>;
  classifyBatch(limit?: number): Promise<RunResult>;
  classifyAll(batchSize?: number): Promise<RunResult>;

  attackSummary(): Promise<AttackSummary>;
  listProfiles(page: number, limit: number, unclassifiedOnly?: boolean): Promise<AttackProfileList>;
  identifyBatch(batchSize?: number): Promise<RunResult>;
  identifyAll(batchSize?: number): Promise<RunResult>;

  createSimulation(req: SimulationRequest): Promise<SimulationRun>;
  getSimulation(runId: string): Promise<SimulationRun>;

  createImpact(simulationRunId: string): Promise<ImpactRecord>;
  getImpact(impactId: string): Promise<ImpactRecord>;
  listImpacts(): Promise<{ impactId: string; severityScore: number; attackType: string }[]>;

  createFinalReport(impactId: string, ftirNumber?: string): Promise<FinalReport>;
  getFinalReport(reportId: string): Promise<FinalReport>;
}
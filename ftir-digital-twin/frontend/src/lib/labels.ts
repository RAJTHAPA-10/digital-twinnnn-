import type { AttackCode, ProcessingStatus, Severity } from "../types/api";

export const ATTACK_LABEL: Record<AttackCode, string> = {
  GPS_SPOOFING: "GPS spoofing",
  CAN_MESSAGE_INJECTION: "CAN injection",
  REPLAY_ATTACK: "Replay",
  DENIAL_OF_SERVICE: "DoS",
  SENSOR_SPOOFING: "Sensor spoofing",
  UNCLASSIFIED: "Unclassified",
};

/** Theme color name per attack type (resolve with useColors() for SVG). */
export const ATTACK_TONE = {
  GPS_SPOOFING: "accent",
  CAN_MESSAGE_INJECTION: "indigo",
  REPLAY_ATTACK: "sev-medium",
  DENIAL_OF_SERVICE: "sev-high",
  SENSOR_SPOOFING: "danger",
  UNCLASSIFIED: "faint",
} as const satisfies Record<AttackCode, string>;

/** CSS color for HTML elements. */
export const attackCss = (code: AttackCode) => `rgb(var(--${ATTACK_TONE[code]}))`;

export const STATUS_LABEL: Record<ProcessingStatus, string> = {
  UPLOADED: "Uploaded",
  PREPROCESSED: "Ready",
  CLASSIFIED: "Classified",
  ATTACK_IDENTIFIED: "Attack found",
  SIMULATED: "Simulated",
  ANALYSED: "Analysed",
  REPORTED: "Reported",
  FAILED: "Failed",
};

export const STATUSES = Object.keys(STATUS_LABEL) as ProcessingStatus[];

export const SEVERITY_LABEL: Record<Severity, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };

export const SEVERITY_VAR: Record<Severity, string> = {
  LOW: "--sev-low",
  MEDIUM: "--sev-medium",
  HIGH: "--sev-high",
  CRITICAL: "--sev-critical",
};

export const ECU_LABEL: Record<string, string> = {
  ENGINE_ECU: "Engine",
  BRAKE_ECU: "Brake",
  STEERING_ECU: "Steering",
  GPS_ECU: "GPS",
  ADAS_ECU: "ADAS",
  INFOTAINMENT_ECU: "Infotainment",
  TELEMATICS_ECU: "Telematics",
  GATEWAY_ECU: "Gateway",
  VIRTUAL_CAN_BUS: "CAN bus",
  SCENARIO_ENGINE: "Attacker",
  SIMULATION_ENGINE: "Simulator",
  REPLAY_BUFFER: "Replay buffer",
  VIRTUAL_FLOOD_SOURCE: "Flood source",
  VIRTUAL_SENSOR_ECU: "Spoofed sensor",
  UNKNOWN: "Unknown",
};

export const ecuLabel = (code: string | null | undefined) =>
  code ? (ECU_LABEL[code] ?? code.replace(/_ECU$/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())) : "—";

const ACRONYMS = new Set(["can", "ecu", "adas", "gps", "dos", "ids"]);

export const humanize = (code: string) =>
  code
    .split("_")
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return i === 0 ? lower.replace(/^\w/, (c) => c.toUpperCase()) : lower;
    })
    .join(" ");

/** Makes backend strings readable: CAN_MESSAGE_INJECTION -> CAN injection, GPS_ECU -> GPS, CRITICAL -> critical. */
export const prettyText = (text: string) =>
  text
    .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, (m) =>
      m in ATTACK_LABEL ? ATTACK_LABEL[m as AttackCode] : m in ECU_LABEL || m.endsWith("_ECU") ? ecuLabel(m) : humanize(m).toLowerCase().replace(/\b(can|ecu|adas|gps)\b/g, (x) => x.toUpperCase()),
    )
    .replace(/\b(LOW|MEDIUM|HIGH|CRITICAL|AFFECTED|NORMAL)\b/g, (m) => m.toLowerCase())
    .replace(/\.\./g, ".");

export const severityFromScore = (score: number): Severity =>
  score >= 9 ? "CRITICAL" : score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";

/** Readable view of what the attack-identification step said about one report. */
export function attackInsight(p: {
  attackType: { code: AttackCode };
  identificationStatus: "IDENTIFIED" | "UNCLASSIFIED";
  simulationParameters: { reason?: string; predictedAttackCode?: AttackCode; targetedEcus?: string[]; lowConfidence?: boolean } | null;
  rawAiResponse: unknown;
}) {
  const raw = (p.rawAiResponse && typeof p.rawAiResponse === "object" ? p.rawAiResponse : {}) as Record<string, unknown>;
  const sp = p.simulationParameters ?? {};
  const predicted = (sp.predictedAttackCode ?? (typeof raw.attackCode === "string" ? raw.attackCode : null)) as AttackCode | null;
  const reason = sp.reason ?? (typeof raw.reason === "string" ? raw.reason : null);
  const ecus = sp.targetedEcus ?? (Array.isArray(raw.targetedEcus) ? (raw.targetedEcus as string[]) : []);
  const downgraded = p.identificationStatus === "UNCLASSIFIED" && predicted !== null && predicted !== "UNCLASSIFIED";
  return { predicted, reason, ecus: ecus.filter((e) => e !== "UNKNOWN"), downgraded, lowConfidence: Boolean(sp.lowConfidence) };
}
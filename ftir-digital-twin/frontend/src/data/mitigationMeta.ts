// Frontend estimates. The backend returns only title, priority and description.
export type Effort = "Low" | "Medium" | "High";

export interface MitigationMeta {
  effort: Effort;
  riskReduction: number; // percent, estimate
  baseline?: BaselineKey;
}

export type BaselineKey = "can-auth" | "ids" | "firmware" | "filtering";

export const BASELINE: { key: BaselineKey; title: string; description: string; priority: "HIGH" | "MEDIUM"; effort: Effort; riskReduction: number }[] = [
  { key: "can-auth", title: "CAN authentication", description: "Sign safety-relevant CAN frames (e.g. AUTOSAR SecOC) so ECUs reject forged or replayed messages.", priority: "HIGH", effort: "High", riskReduction: 35 },
  { key: "ids", title: "Intrusion detection system", description: "Watch bus timing, rates and payloads to spot injected, flooded or replayed traffic in real time.", priority: "HIGH", effort: "Medium", riskReduction: 25 },
  { key: "firmware", title: "Firmware update", description: "Ship signed, verified firmware to affected ECUs to close the weakness that allowed the attack.", priority: "MEDIUM", effort: "Medium", riskReduction: 20 },
  { key: "filtering", title: "Message filtering", description: "Allowlist message IDs per ECU at the gateway and drop anything a node shouldn't send.", priority: "MEDIUM", effort: "Low", riskReduction: 15 },
];

export const MITIGATION_META: Record<string, MitigationMeta> = {
  "GPS Signal Validation": { effort: "Medium", riskReduction: 30 },
  "Multi-Sensor Cross-Validation": { effort: "High", riskReduction: 30 },
  "Navigation Safe Fallback": { effort: "Low", riskReduction: 15 },
  "CAN Message Authentication": { effort: "High", riskReduction: 35, baseline: "can-auth" },
  "Authenticated CAN Messages": { effort: "High", riskReduction: 35, baseline: "can-auth" },
  "ECU Message Allowlisting": { effort: "Low", riskReduction: 20, baseline: "filtering" },
  "CAN Intrusion Detection": { effort: "Medium", riskReduction: 25, baseline: "ids" },
  "Flood Detection IDS": { effort: "Medium", riskReduction: 25, baseline: "ids" },
  "Replay Detection Rules": { effort: "Low", riskReduction: 20, baseline: "ids" },
  "Network Segmentation": { effort: "High", riskReduction: 25 },
  "Message Freshness Protection": { effort: "Medium", riskReduction: 30, baseline: "can-auth" },
  "CAN Bus Rate Limiting": { effort: "Low", riskReduction: 25, baseline: "filtering" },
  "Safety-Critical Traffic Prioritization": { effort: "Medium", riskReduction: 15 },
  "ECU Watchdog Recovery": { effort: "Low", riskReduction: 10 },
  "Sensor Plausibility Checks": { effort: "Medium", riskReduction: 25 },
  "Sensor Cross-Validation": { effort: "High", riskReduction: 30 },
  "ADAS Safe Degradation": { effort: "Medium", riskReduction: 15 },
  "Secure ECU Firmware Updates": { effort: "Medium", riskReduction: 20, baseline: "firmware" },
  "Incident Review and Evidence Retention": { effort: "Low", riskReduction: 5 },
};

export const DEFAULT_META: MitigationMeta = { effort: "Medium", riskReduction: 15 };

export const metaFor = (title: string) => MITIGATION_META[title] ?? DEFAULT_META;

/** Combined reduction, assuming independent effects: 1 - Π(1 - r). */
export const combinedReduction = (values: number[]) =>
  Math.round((1 - values.reduce((acc, r) => acc * (1 - r / 100), 1)) * 100);

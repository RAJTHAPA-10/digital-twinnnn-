import { request } from "./http";

export type LlmAttackType = "GPS_SPOOFING" | "CAN_MESSAGE_INJECTION" | "REPLAY_ATTACK" | "DENIAL_OF_SERVICE" | "SENSOR_SPOOFING" | "OTHER";

export interface CyberExplanation {
  summary: string;
  reasons: { point: string; quote: string | null }[];
  model: string;
  attack?: { type: LlmAttackType; name: string; explanation: string; example?: string };
}

interface ExplainInput {
  ftirNumber: string;
  text: string;
  backendReason?: string | null;
}

const CACHE_PREFIX = "vcia-llm:";

/** An attack answer is only complete if it includes the attack type and an example. */
const isComplete = (task: "cyber" | "attack", d: CyberExplanation) => task === "cyber" || Boolean(d.attack?.example);

async function ask(task: "cyber" | "attack", input: ExplainInput): Promise<CyberExplanation> {
  const key = `${CACHE_PREFIX}${task}:${input.ftirNumber}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as CyberExplanation;
      if (isComplete(task, parsed)) return parsed; // ignore answers saved by an older version
    }
  } catch {
    /* storage unavailable */
  }
  const data = await request<CyberExplanation>("/llm/explain", { method: "POST", body: { ...input, task }, timeout: 60_000 });
  try {
    if (isComplete(task, data)) localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* storage full or unavailable */
  }
  return data;
}

/** Why a report is a cyber attack (no attack type). Used on the AI Cyber Filter page. */
export const explainCyberAttack = (input: ExplainInput) => ask("cyber", input);

/** Why it's a cyber attack AND what kind of attack it is. Used on the Threat Correlation page. */
export const explainAttackType = (input: ExplainInput) => ask("attack", input);
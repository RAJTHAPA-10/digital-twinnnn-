import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

/**
 * Dev-server endpoint: POST /llm/explain
 * Asks Gemini, in plain language, why an FTIR report is a cyber attack.
 *
 * Runs inside the Vite dev server (Node), so the API key never reaches the browser.
 * The backend is not modified; we only READ its .env for the key and model names.
 */

type Task = "cyber" | "attack";

interface ExplainInput {
  ftirNumber: string;
  text: string;
  backendReason?: string | null;
  /** "cyber" = why it's a cyber attack. "attack" = also identify the kind of attack. */
  task?: Task;
}

const ATTACK_TYPES = ["GPS_SPOOFING", "CAN_MESSAGE_INJECTION", "REPLAY_ATTACK", "DENIAL_OF_SERVICE", "SENSOR_SPOOFING", "OTHER"] as const;

interface ExplainOutput {
  summary: string;
  reasons: { point: string; quote: string | null }[];
  model: string;
  attack?: { type: (typeof ATTACK_TYPES)[number]; name: string; explanation: string; example: string };
}

export interface LlmConfig {
  apiKey: string | undefined;
  models: string[];
  apiBase: string;
}

const ATTACK_GUIDE = `
Also identify WHAT KIND of attack this most likely is. Pick exactly one "attackType":
- GPS_SPOOFING: fake satellite/location signals make the car think it is somewhere else.
- CAN_MESSAGE_INJECTION: fake commands are sent on the car's internal network (CAN bus) to control parts of the car.
- REPLAY_ATTACK: a real signal or message is recorded and sent again later (e.g. a captured key fob signal).
- DENIAL_OF_SERVICE: the car's network or a unit is flooded or blocked so it stops working properly.
- SENSOR_SPOOFING: sensors (radar, camera, etc.) are fed fake readings.
- OTHER: it is cyber-related but fits none of the above (e.g. app/account hacking, unauthorised software changes, phone/Bluetooth access).
"attackName": a short plain-English name (2–5 words), e.g. "Fake location signal" or "Unauthorised phone access".
"attackExplanation": 2–3 simple sentences: what this kind of attack is, and why it fits THIS report.
"attackExample": one short, concrete real-world example of how this kind of attack is typically carried out on a car (2–3 sentences, plain words, no step-by-step instructions).`;

const PROMPT = (input: ExplainInput) => `You explain vehicle field incident reports to non-technical service staff.

This report was already flagged as a CYBER ATTACK by an automated classifier.
Explain, in simple everyday English, WHY this report points to a cyber attack rather than a normal mechanical or electrical fault.

Rules:
- Write for someone with no security background. Short sentences. No jargon; if a technical word is needed, explain it in a few words.
- Base everything ONLY on the report text below. Do not invent facts.
${input.task === "attack" ? "- In summary and reasons, focus on WHY it is cyber; put the attack type only in the attack fields." : '- Do NOT name or guess a specific attack type (no "spoofing", "replay", "injection", "DoS" labels).'}
- "summary": 1–2 sentences, the main reason in plain words.
- "reasons": 2–4 short points. For each, "quote" must be words copied EXACTLY from the report text that support the point, or "" if none.
${input.task === "attack" ? ATTACK_GUIDE : ""}

FTIR ID: ${input.ftirNumber}
Report text: """${input.text}"""
${input.backendReason ? `Classifier's note: """${input.backendReason}"""` : ""}`;

const ATTACK_SCHEMA_PROPS = {
  attackType: { type: "STRING", enum: [...ATTACK_TYPES] },
  attackName: { type: "STRING" },
  attackExplanation: { type: "STRING" },
  attackExample: { type: "STRING" },
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    reasons: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { point: { type: "STRING" }, quote: { type: "STRING" } },
        required: ["point", "quote"],
      },
    },
  },
  required: ["summary", "reasons"],
};

/** Keep a quote only if it really appears in the report (case-insensitive), using the report's own wording. */
function verifyQuote(text: string, quote: string): string | null {
  const q = quote.trim().replace(/^["'“”]+|["'“”]+$/g, "");
  if (q.length < 3) return null;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i >= 0 ? text.slice(i, i + q.length) : null;
}

async function callGemini(cfg: LlmConfig, model: string, input: ExplainInput): Promise<ExplainOutput> {
  const res = await fetch(`${cfg.apiBase}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.apiKey ?? "" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT(input) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema:
          input.task === "attack"
            ? { ...SCHEMA, properties: { ...SCHEMA.properties, ...ATTACK_SCHEMA_PROPS }, required: [...SCHEMA.required, "attackType", "attackName", "attackExplanation", "attackExample"] }
            : SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Gemini ${model} answered ${res.status}`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const parsed = JSON.parse(raw) as {
    summary?: string;
    reasons?: { point?: string; quote?: string }[];
    attackType?: string;
    attackName?: string;
    attackExplanation?: string;
    attackExample?: string;
  };
  if (!parsed.summary) throw new Error("Empty answer from Gemini");
  return {
    summary: parsed.summary.trim(),
    reasons: (parsed.reasons ?? [])
      .filter((r) => r.point)
      .slice(0, 4)
      .map((r) => ({ point: r.point!.trim(), quote: r.quote ? verifyQuote(input.text, r.quote) : null })),
    model,
    ...(input.task === "attack"
      ? {
          attack: {
            type: (ATTACK_TYPES as readonly string[]).includes(parsed.attackType ?? "") ? (parsed.attackType as (typeof ATTACK_TYPES)[number]) : "OTHER",
            name: parsed.attackName?.trim() || "Unknown",
            explanation: parsed.attackExplanation?.trim() || "",
            example: parsed.attackExample?.trim() || "",
          },
        }
      : {}),
  };
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 50_000) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export function llmExplainPlugin(cfg: LlmConfig): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") return send(res, 405, { success: false, message: "Use POST." });
    if (!cfg.apiKey) {
      return send(res, 503, { success: false, message: "No Gemini API key found. Add GEMINI_API_KEY to frontend/.env (or backend/.env)." });
    }
    let input: ExplainInput;
    try {
      input = JSON.parse(await readBody(req)) as ExplainInput;
    } catch {
      return send(res, 400, { success: false, message: "Invalid request body." });
    }
    if (!input?.text?.trim() || !input.ftirNumber) return send(res, 400, { success: false, message: "ftirNumber and text are required." });

    const errors: string[] = [];
    for (const model of cfg.models) {
      try {
        const task: Task = input.task === "attack" ? "attack" : "cyber";
        const data = await callGemini(cfg, model, { ...input, task, text: input.text.slice(0, 4000) });
        return send(res, 200, { success: true, data });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    return send(res, 502, { success: false, message: "The AI couldn't explain this report right now.", errors });
  };

  return {
    name: "llm-explain",
    configureServer(server) {
      server.middlewares.use("/llm/explain", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/llm/explain", handler);
    },
  };
}
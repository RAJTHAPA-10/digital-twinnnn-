import { geminiClient, geminiConfig } from "../../../config/gemini.config.js";
import { REPORT_SECTIONS, plainReportResponseJsonSchema, plainReportResponseSchema } from "../report.llmSchema.js";
import { NOT_AVAILABLE, REPORT_PROMPT_VERSION, REPORT_SYSTEM_INSTRUCTION, buildReportPrompt } from "../report.prompt.js";

const TIMEOUT_MS = Number(process.env.REPORT_TIMEOUT_MS) || 20_000;
const TOTAL_BUDGET_MS = 40_000; 

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini did not answer within ${ms} ms.`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });



const NUMBER_PATTERN = /\d+(?:,\d{3})*(?:\.\d+)?/g;
const toNumbers = (text) => (String(text).match(NUMBER_PATTERN) ?? []).map((n) => Number(n.replace(/,/g, "")));

const collectAllowedNumbers = (data) => {
  const allowed = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); 
  const add = (n) => {
    allowed.add(n);
    allowed.add(Math.round(n));
    allowed.add(Number(n.toFixed(1)));
    if (n > 0 && n < 1) allowed.add(Math.round(n * 100)); // 0.92 -> 92 %
  };
  const walk = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === "number") add(value);
    else if (typeof value === "string") toNumbers(value).forEach(add);
    else if (Array.isArray(value)) { add(value.length); value.forEach(walk); }
    else if (typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(data);
  return allowed;
};

const findInventedNumbers = (report, data) => {
  const allowed = collectAllowedNumbers(data);
  const text = [report.summary, ...report.sections.map((s) => s.body)].join(" ");
  return [...new Set(toNumbers(text).filter((n) => !allowed.has(n)))];
};



const join = (items) => (items?.length ? [...new Set(items)].join(" ") : "");

export const buildTemplateReport = (data) => {
  const { step1_ftir: f, step2_classification: c, step3_attack: a, step4_simulation: s, step5_impact: i, step6_actions: r } = data;
  const bodies = {
    incident: f
      ? `Report ${f.ftirNumber} is about the vehicle model ${f.vehicleModel ?? "(not given)"}${f.mileageKm != null ? `, which had ${f.mileageKm} km on it` : ""}. The workshop reported: "${f.reportedProblem}".`
      : `This was a manual test run, so there is no field report. ${NOT_AVAILABLE}`,
    classification: c
      ? `The AI classified this report as: ${c.decision}${c.confidencePercent != null ? ` (confidence ${c.confidencePercent}%)` : ""}. Reason: ${c.reason}`
      : NOT_AVAILABLE,
    attack: a
      ? `The identified attack type is ${a.attackType}. Root cause: ${a.rootCause} ${a.description}`
      : NOT_AVAILABLE,
    simulation: s
      ? `The attack "${s.simulatedAttack}" was tested on a virtual car for ${s.durationSeconds} seconds. ${join(s.whatWasObserved)}`
      : NOT_AVAILABLE,
    impact: `The severity is ${i.severity} (${i.severityScoreOutOf10} out of 10). ${join([...i.whySoSerious, ...i.effectOnTheCar])}`.trim(),
    actions: r.recommendations.length
      ? r.recommendations.map((rec, n) => `${n + 1}) ${rec.title} (${rec.priority} priority): ${rec.whatToDo}`).join(" ")
      : NOT_AVAILABLE,
  };
  return {
    source: "TEMPLATE",
    summary: `${f ? `Report ${f.ftirNumber}` : "This test run"} was analysed as ${a?.attackType ?? s?.simulatedAttack ?? "a cyber incident"}. The simulated impact is ${i.severity} (${i.severityScoreOutOf10} out of 10). ${r.recommendations.length} actions are recommended.`,
    sections: REPORT_SECTIONS.map(({ key, heading }) => ({ key, heading, body: bodies[key] })),
  };
};



export const writePlainReport = async (pipelineData) => {
  const contents = buildReportPrompt(pipelineData);
  const startedAt = Date.now();
  const failures = [];

  for (const modelName of geminiConfig.models) {
    if (Date.now() - startedAt > TOTAL_BUDGET_MS) break;
    try {
      const response = await withTimeout(
        geminiClient.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: REPORT_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseJsonSchema: plainReportResponseJsonSchema,
            temperature: 0.1, 
          },
        }),
        TIMEOUT_MS,
      );

      const parsed = plainReportResponseSchema.parse(JSON.parse(response.text ?? ""));

      const keys = parsed.sections.map((section) => section.key);
      if (new Set(keys).size !== REPORT_SECTIONS.length) throw new Error("Report sections are missing or repeated.");

      const invented = findInventedNumbers(parsed, pipelineData);
      if (invented.length) throw new Error(`Report used numbers that are not in the data: ${invented.join(", ")}`);

      const bodyByKey = Object.fromEntries(parsed.sections.map((section) => [section.key, section.body]));
      console.log(`[report] ${modelName} wrote the easy-read report in ${Date.now() - startedAt} ms`);

      return {
        source: "AI",
        modelName,
        promptVersion: REPORT_PROMPT_VERSION,
        summary: parsed.summary,
        sections: REPORT_SECTIONS.map(({ key, heading }) => ({ key, heading, body: bodyByKey[key] })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${modelName}: ${message.slice(0, 300)}`);
      console.error(`[report] ${modelName} failed:`, message.slice(0, 300));
    }
  }

  console.warn("[report] Using the template report instead of the AI report.");
  return { ...buildTemplateReport(pipelineData), failures };
};
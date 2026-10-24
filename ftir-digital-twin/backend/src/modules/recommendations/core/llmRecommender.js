import { geminiClient, geminiConfig } from "../../../config/gemini.config.js";
import {
  buildRecommendationPrompt,
  RECOMMENDATION_PROMPT_VERSION,
  RECOMMENDATION_SYSTEM_INSTRUCTION,
} from "../recommendation.prompt.js";
import {
  recommendationResponseJsonSchema,
  recommendationResponseSchema,
} from "../recommendation.llmSchema.js";

const TIMEOUT_MS = Number(process.env.RECOMMENDATION_TIMEOUT_MS) || 30_000;

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini did not answer within ${ms} ms.`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const allowedEcusFor = (analysis) =>
  new Set([
    ...(analysis.affectedEcus ?? []),
    ...(analysis.directlyTargetedEcus ?? []),
    ...(analysis.propagationPath ?? []),
  ]);

const cleanRecommendations = (recommendations, analysis) => {
  const allowed = allowedEcusFor(analysis);
  const seenTitles = new Set();

  return recommendations
    .filter((rec) => {
      const key = rec.title.toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .map((rec, index) => ({
      id: `ai-${index + 1}`,
      ...rec,
      targetEcus: rec.targetEcus.filter((ecu) => allowed.has(ecu)),
    }));
};


export const generateLlmRecommendations = async ({ impactRecord, incidentContext }) => {
  const contents = buildRecommendationPrompt({ impactRecord, incidentContext });
  const failures = [];

  for (let index = 0; index < geminiConfig.models.length; index += 1) {
    const modelName = geminiConfig.models[index];
    const startedAt = Date.now();

    try {
      const response = await withTimeout(
        geminiClient.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: RECOMMENDATION_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseJsonSchema: recommendationResponseJsonSchema,
            temperature: 0.2,
          },
        }),
        TIMEOUT_MS,
      );

      const text = response.text?.trim();
      if (!text) throw new Error("Gemini returned an empty recommendation response.");

      const parsed = recommendationResponseSchema.parse(JSON.parse(text));
      const recommendations = cleanRecommendations(parsed.recommendations, impactRecord.analysis);

      if (recommendations.length < 3) {
        throw new Error("Gemini returned fewer than 3 usable recommendations.");
      }

      const usage = response.usageMetadata ?? {};
      const responseTimeMs = Date.now() - startedAt;

     
      console.log(
        `[recommendations] ${modelName} ok in ${responseTimeMs} ms, tokens=${usage.totalTokenCount ?? "?"}`,
      );

      return {
        summary: parsed.summary,
        recommendations,
        generation: {
          source: "AI",
          modelName,
          attemptNumber: index + 1,
          promptVersion: RECOMMENDATION_PROMPT_VERSION,
          responseTimeMs,
          inputTokens: usage.promptTokenCount ?? null,
          outputTokens: usage.candidatesTokenCount ?? null,
          totalTokens: usage.totalTokenCount ?? null,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${modelName}: ${message.slice(0, 300)}`);
      console.error(`[recommendations] ${modelName} failed:`, message);
    }
  }

  const error = new Error("Every configured Gemini model failed to generate recommendations.");
  error.failures = failures;
  throw error;
};
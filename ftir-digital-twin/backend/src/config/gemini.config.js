import { GoogleGenAI } from "@google/genai";

const getPositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
};

const getConfidenceThreshold = (value, fallback) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1
    ? parsedValue
    : fallback;
};

const modelFallbackChain = [
  process.env.GEMINI_MODEL_PRIMARY,
  process.env.GEMINI_MODEL_FALLBACK_1,
  process.env.GEMINI_MODEL_FALLBACK_2,
].filter(Boolean);

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from the environment variables.");
}

if (modelFallbackChain.length === 0) {
  throw new Error("At least one Gemini model must be configured.");
}

export const geminiClient = new GoogleGenAI({
  apiKey,
});

export const geminiConfig = {
  models: [...new Set(modelFallbackChain)],

  // Module 2: AI Classification
  batchSize: getPositiveInteger(
    process.env.CLASSIFICATION_BATCH_SIZE,
    10,
  ),

  lowConfidenceThreshold: getConfidenceThreshold(
    process.env.CLASSIFICATION_LOW_CONFIDENCE_THRESHOLD,
    0.75,
  ),

  promptVersion: "classification-v1",

  // Module 3: Attack Identification
  attackIdentificationBatchSize: getPositiveInteger(
    process.env.ATTACK_IDENTIFICATION_BATCH_SIZE,
    3,
  ),

  attackIdentificationLowConfidenceThreshold: getConfidenceThreshold(
    process.env.ATTACK_IDENTIFICATION_LOW_CONFIDENCE_THRESHOLD,
    0.75,
  ),

  attackIdentificationPromptVersion:
    process.env.ATTACK_IDENTIFICATION_PROMPT_VERSION ||
    "attack-identification-v1",
};
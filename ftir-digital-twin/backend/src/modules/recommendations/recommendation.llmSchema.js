import { z } from "zod";

export const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const CATEGORIES = ["PREVENTION", "DETECTION", "RESPONSE", "RECOVERY"];

export const KNOWN_ECUS = [
  "ENGINE_ECU",
  "BRAKE_ECU",
  "STEERING_ECU",
  "GPS_ECU",
  "ADAS_ECU",
  "VIRTUAL_CAN_BUS",
  "GATEWAY",
];

const recommendationSchema = z.object({
  title: z.string().trim().min(5).max(80),
  priority: z.enum(PRIORITIES),
  category: z.enum(CATEGORIES),
  targetEcus: z.array(z.string().trim().min(2).max(40)).max(7),
  description: z.string().trim().min(20).max(600),
  rationale: z.string().trim().min(20).max(600),
});

export const recommendationResponseSchema = z.object({
  summary: z.string().trim().min(20).max(800),
  recommendations: z.array(recommendationSchema).min(3).max(6),
});

export const recommendationResponseJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: PRIORITIES },
          category: { type: "string", enum: CATEGORIES },
          targetEcus: {
            type: "array",
            items: { type: "string", enum: KNOWN_ECUS },
          },
          description: { type: "string" },
          rationale: { type: "string" },
        },
        required: [
          "title",
          "priority",
          "category",
          "targetEcus",
          "description",
          "rationale",
        ],
      },
    },
  },
  required: ["summary", "recommendations"],
};
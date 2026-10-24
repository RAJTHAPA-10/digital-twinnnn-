import { z } from "zod";

export const CLASSIFICATION_LABELS = [
  "CYBERSECURITY",
  "NON_CYBERSECURITY",
];

export const classificationItemSchema = z.object({
  reportId: z.string().min(1),
  label: z.enum(CLASSIFICATION_LABELS),
  confidenceScore: z.number().min(0).max(1),
  reason: z.string().trim().min(10).max(600),
});

export const classificationResponseSchema = z.object({
  classifications: z.array(classificationItemSchema).min(1),
});

export const classificationResponseJsonSchema = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reportId: {
            type: "string",
          },
          label: {
            type: "string",
            enum: CLASSIFICATION_LABELS,
          },
          confidenceScore: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          reason: {
            type: "string",
          },
        },
        required: [
          "reportId",
          "label",
          "confidenceScore",
          "reason",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["classifications"],
  additionalProperties: false,
};
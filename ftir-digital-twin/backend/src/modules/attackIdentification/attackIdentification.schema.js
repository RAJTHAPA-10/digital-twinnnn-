import { z } from "zod";

export const ATTACK_CODES = [
  "GPS_SPOOFING",
  "CAN_MESSAGE_INJECTION",
  "REPLAY_ATTACK",
  "DENIAL_OF_SERVICE",
  "SENSOR_SPOOFING",
  "UNCLASSIFIED",
];

export const ECU_CODES = [
  "ENGINE_ECU",
  "BRAKE_ECU",
  "STEERING_ECU",
  "GPS_ECU",
  "ADAS_ECU",
  "INFOTAINMENT_ECU",
  "UNKNOWN",
];

const resultSchema = z.object({
  reportId: z.string().min(1),
  attackCode: z.enum(ATTACK_CODES),
  identificationStatus: z.enum(["IDENTIFIED", "UNCLASSIFIED"]),
  confidenceScore: z.number().min(0).max(1),
  rootCause: z.string().trim().min(15).max(800),
  attackDescription: z.string().trim().min(20).max(1200),
  targetedEcus: z.array(z.enum(ECU_CODES)).min(1).max(5),
  simulationParameters: z.object({
    scenario: z.string().trim().min(5).max(200),
    durationSeconds: z.number().int().min(5).max(120),
    expectedEffects: z.array(z.string().trim().min(5).max(300)).min(1).max(6),
  }),
  reason: z.string().trim().min(15).max(800),
});

export const attackIdentificationResponseSchema = z.object({
  attackProfiles: z.array(resultSchema).min(1),
});

export const attackIdentificationResponseJsonSchema = {
  type: "object",
  properties: {
    attackProfiles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reportId: { type: "string" },
          attackCode: { type: "string", enum: ATTACK_CODES },
          identificationStatus: {
            type: "string",
            enum: ["IDENTIFIED", "UNCLASSIFIED"],
          },
          confidenceScore: { type: "number", minimum: 0, maximum: 1 },
          rootCause: { type: "string" },
          attackDescription: { type: "string" },
          targetedEcus: {
            type: "array",
            items: { type: "string", enum: ECU_CODES },
          },
          simulationParameters: {
            type: "object",
            properties: {
              scenario: { type: "string" },
              durationSeconds: { type: "integer", minimum: 5, maximum: 120 },
              expectedEffects: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["scenario", "durationSeconds", "expectedEffects"],
          },
          reason: { type: "string" },
        },
        required: [
          "reportId",
          "attackCode",
          "identificationStatus",
          "confidenceScore",
          "rootCause",
          "attackDescription",
          "targetedEcus",
          "simulationParameters",
          "reason",
        ],
      },
    },
  },
  required: ["attackProfiles"],
};
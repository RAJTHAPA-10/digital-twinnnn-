import { z } from "zod";

export const REPORT_SECTIONS = [
  { key: "incident", heading: "1. What was reported" },
  { key: "classification", heading: "2. Why it was treated as a cyber attack" },
  { key: "attack", heading: "3. What kind of attack it is" },
  { key: "simulation", heading: "4. What happened when we simulated it" },
  { key: "impact", heading: "5. How serious it is" },
  { key: "actions", heading: "6. What should be done" },
];

const SECTION_KEYS = REPORT_SECTIONS.map((section) => section.key);

export const plainReportResponseSchema = z.object({
  summary: z.string().trim().min(30).max(900),
  sections: z
    .array(
      z.object({
        key: z.enum(SECTION_KEYS),
        body: z.string().trim().min(20).max(1600),
      }),
    )
    .length(SECTION_KEYS.length),
});

export const plainReportResponseJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    sections: {
      type: "array",
      minItems: SECTION_KEYS.length,
      maxItems: SECTION_KEYS.length,
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: SECTION_KEYS },
          body: { type: "string" },
        },
        required: ["key", "body"],
      },
    },
  },
  required: ["summary", "sections"],
};
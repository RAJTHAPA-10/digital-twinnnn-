import { z } from "zod";

export const reportImportSchema = z.object({
  ftirNumber: z.string().trim().min(1, "FTIR number is required."),

  vehicleModel: z.string().trim().nullable(),
  mileage: z.number().int().nonnegative().nullable(),

  rawRegistrationDate: z.string().nullable(),
  registrationDate: z.date().nullable(),

  rawFtirReportDate: z.string().nullable(),
  ftirReportDate: z.date().nullable(),

  rawIncidentDate: z.string().nullable(),
  incidentDate: z.date().nullable(),

  rawSubject: z.string().trim().min(1, "Subject text is required."),
  cleanedSubject: z.string().trim().min(1, "Cleaned subject is required."),

  sourceType: z.literal("COMPANY"),
  processingStatus: z.literal("PREPROCESSED")
});
import { z } from "zod";

export const createShareLinkSchema = z.object({
  fileIds: z.array(z.string()).min(1, "Selecteer minimaal één bestand"),
  recipients: z
    .array(z.string().email("Ongeldig e-mailadres"))
    .min(1, "Voeg minimaal één ontvanger toe"),
  message: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

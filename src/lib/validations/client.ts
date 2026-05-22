import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(100),
});

export const updateClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Naam is verplicht").max(100),
});

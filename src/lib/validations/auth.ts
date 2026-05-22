import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
    newPassword: z
      .string()
      .min(8, "Nieuw wachtwoord minimaal 8 tekens")
      .regex(/[A-Z]/, "Wachtwoord moet minimaal één hoofdletter bevatten")
      .regex(/[0-9]/, "Wachtwoord moet minimaal één cijfer bevatten"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

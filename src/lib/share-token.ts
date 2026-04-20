import { db } from "./db";

export async function validateShareToken(token: string) {
  const link = await db.shareLink.findUnique({
    where: { token },
    include: {
      files: {
        include: {
          file: true,
          client: true,
        },
      },
      createdBy: {
        select: { name: true, email: true },
      },
      downloads: true,
    },
  });

  if (!link) return { valid: false, reason: "not_found" as const, link: null };
  if (link.revokedAt) return { valid: false, reason: "revoked" as const, link };
  if (new Date(link.expiresAt) < new Date())
    return { valid: false, reason: "expired" as const, link };

  return { valid: true, reason: null, link };
}

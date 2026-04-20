import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/SettingsClient";

export default async function InstellingenPage() {
  const session = await requireAuth();

  const [user, otherUsers] = await Promise.all([
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        role: true,
        color: true,
        notifTasks: true,
        notifShare: true,
        notifAgenda: true,
      },
    }),
    db.user.findMany({
      where: { id: { not: session.userId } },
      select: { color: true },
    }),
  ]);

  if (!user) return null;

  return <SettingsClient user={user} takenColors={otherUsers.map((u) => u.color)} />;
}

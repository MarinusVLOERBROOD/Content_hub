export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const dbUser = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, color: true, avatarPath: true },
  });

  return (
    <div className="flex h-full overflow-hidden">
      <AdminSidebar user={{ name: session.name, email: session.email, role: session.role, color: dbUser?.color ?? "teal", userId: dbUser?.id ?? session.userId, avatarPath: dbUser?.avatarPath ?? null }} />
      <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}

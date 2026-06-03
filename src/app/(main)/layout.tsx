import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/layout/Sidebar";
import { ToastProvider } from "@/contexts/ToastContext";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, color: true, avatarPath: true },
  });

  return (
    <ToastProvider>
      <div className="flex h-full overflow-hidden">
        <Sidebar user={{ name: session.name, email: session.email, role: session.role, color: dbUser?.color ?? "teal", userId: dbUser?.id ?? session.userId, avatarPath: dbUser?.avatarPath ?? null }} />
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </ToastProvider>
  );
}

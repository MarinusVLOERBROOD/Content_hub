"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Folder, Settings, Share2, ArrowLeft } from "lucide-react";
import { UserMenu } from "./UserMenu";

const adminNavItems = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard },
  { href: "/admin/gebruikers", label: "Gebruikers", icon: Users },
  { href: "/admin/mappen", label: "Mapstructuur", icon: Folder },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
];

interface AdminSidebarProps {
  user: { name: string; email: string; role: string; color: string };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col h-full shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-base">Beheer</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {adminNavItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-orange-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Terug naar app
          </Link>
        </div>
      </nav>

      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <UserMenu name={user.name} email={user.email} role={user.role} color={user.color} />
      </div>
    </aside>
  );
}

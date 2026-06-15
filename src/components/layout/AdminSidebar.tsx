"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Folder, Settings, Share2, Trash2, ArrowLeft } from "lucide-react";
import { UserMenu } from "./UserMenu";

const adminNavItems = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard },
  { href: "/admin/gebruikers", label: "Gebruikers", icon: Users },
  { href: "/admin/mappen", label: "Mapstructuur", icon: Folder },
  { href: "/admin/deellinks", label: "Deellinks", icon: Share2 },
  { href: "/admin/prullebak", label: "Prullebak", icon: Trash2 },
  { href: "/admin/instellingen", label: "Instellingen", icon: Settings },
];

interface AdminSidebarProps {
  user: { name: string; email: string; role: string; color: string; userId: string; avatarPath?: string | null };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobiele topbar met geanimeerde hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-[#1b1117] flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex flex-col justify-center gap-1.5 w-6 h-6 shrink-0"
          aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
        >
          <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-200 origin-center ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-white rounded transition-all duration-200 origin-center ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
        <div className="w-6 h-6 bg-purple-700 rounded-md flex items-center justify-center shrink-0">
          <Settings className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-white text-sm">Beheer</span>
      </div>

      {/* Sidebar — full-screen op mobiel, vaste breedte op desktop */}
      <aside
        className={`w-full lg:w-56 bg-[#1b1117] text-slate-100 flex flex-col h-full shrink-0
          fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto
          transition-transform duration-200 ease-in-out
          pt-12 lg:pt-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="hidden lg:flex items-center gap-2.5 px-5 py-5 border-b border-[#2a1b23]">
          <div className="w-7 h-7 bg-purple-700 rounded-md flex items-center justify-center shrink-0">
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
                    ? "bg-purple-700 text-white"
                    : "text-slate-400 hover:bg-[#2a1b23] hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-[#2a1b23]">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-[#2a1b23] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Terug naar app
            </Link>
          </div>
        </nav>

        <div className="px-3 pb-4 border-t border-[#2a1b23] pt-3">
          <UserMenu name={user.name} email={user.email} role={user.role} color={user.color} userId={user.userId} avatarPath={user.avatarPath} />
        </div>
      </aside>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Files,
  CalendarDays,
  Share2,
  CheckSquare,
  Shield,
  UserPlus,
  Menu,
  X,
} from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ClientModal } from "@/components/bestanden/ClientModal";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/taken", label: "Taken", icon: CheckSquare },
  { href: "/bestanden", label: "Bestanden", icon: Files },
  { href: "/delen", label: "Delen", icon: Share2 },
];

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    color: string;
    userId: string;
    avatarPath?: string | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Hamburger knop — alleen zichtbaar op mobiel */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-[#1b1117] text-slate-100 shadow-lg"
        aria-label="Menu openen"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop — mobiel, alleen als open */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-56 bg-[#1b1117] text-slate-100 flex flex-col h-full shrink-0
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Sluitknop — alleen zichtbaar op mobiel */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a1b23]"
          aria-label="Menu sluiten"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-[#2a1b23] hover:opacity-80 transition-opacity">
          <img src="/favicon.ico" alt="Logo" className="w-7 h-7 shrink-0" />
          <span className="font-semibold text-base">Team Hub</span>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-700 text-white"
                    : "text-slate-400 hover:bg-[#2a1b23] hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}

          {/* Admin link */}
          {user.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-teal-700 text-white"
                  : "text-slate-400 hover:bg-[#2a1b23] hover:text-white"
              }`}
            >
              <Shield className="w-5 h-5" />
              Beheer
            </Link>
          )}
        </nav>

        <div className="px-3 pb-4 pt-3 space-y-2 border-t border-[#2a1b23]">
          <button
            onClick={() => setClientModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-[#2a1b23] hover:text-white transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Nieuwe klant
          </button>
          <UserMenu name={user.name} email={user.email} role={user.role} color={user.color} userId={user.userId} avatarPath={user.avatarPath} />
        </div>

        <ClientModal
          open={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
        />
      </aside>
    </>
  );
}

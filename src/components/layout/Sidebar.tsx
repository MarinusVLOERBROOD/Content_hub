"use client";

import { useState } from "react";
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
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [clientModalOpen, setClientModalOpen] = useState(false);

  return (
    <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="w-7 h-7 bg-teal-600 rounded-md flex items-center justify-center shrink-0">
          <Share2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-base">Content Hub</span>
      </div>

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
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
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
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Shield className="w-5 h-5" />
            Beheer
          </Link>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-slate-800 pt-3 space-y-2">
        <button
          onClick={() => setClientModalOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Nieuwe klant
        </button>
        <UserMenu name={user.name} email={user.email} role={user.role} color={user.color} />
      </div>

      <ClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
      />
    </aside>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { logout } from "@/actions/auth";
import { useTransition } from "react";

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
  color: string;
}

export function UserMenu({ name, email, role, color }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Avatar name={name} size="sm" color={color} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          <p className="text-xs text-slate-400 truncate">{role === "admin" ? "Beheerder" : "Gebruiker"}</p>
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-800">{name}</p>
            <p className="text-xs text-slate-400">{email}</p>
          </div>
          <Link
            href="/instellingen"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Settings size={14} />
            Instellingen
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              startTransition(() => logout());
            }}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
          >
            <LogOut size={14} />
            {isPending ? "Uitloggen..." : "Uitloggen"}
          </button>
        </div>
      )}
    </div>
  );
}

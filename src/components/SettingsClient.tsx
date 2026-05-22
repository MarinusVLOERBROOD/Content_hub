"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateNotifications } from "@/actions/settings";
import { changePassword } from "@/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { CheckCircle2 } from "lucide-react";

const colorOptions = [
  { value: "teal", hex: "#14b8a6", label: "Teal" },
  { value: "blue", hex: "#3b82f6", label: "Blauw" },
  { value: "purple", hex: "#a855f7", label: "Paars" },
  { value: "red", hex: "#ef4444", label: "Rood" },
  { value: "orange", hex: "#f97316", label: "Oranje" },
  { value: "green", hex: "#22c55e", label: "Groen" },
];

function colorToHex(color: string): string {
  if (color.startsWith("#")) return color;
  const found = colorOptions.find((c) => c.value === color);
  return found?.hex ?? "#14b8a6";
}

function isValidHex(val: string): boolean {
  return /^#[0-9a-fA-F]{3,6}$/.test(val);
}

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/);
  if (!m) return null;
  return "#" + [m[1], m[2], m[3]]
    .map((n) => Math.min(255, parseInt(n)).toString(16).padStart(2, "0"))
    .join("");
}

interface User {
  id: string;
  name: string;
  email: string;
  jobTitle?: string | null;
  role: string;
  color: string;
  notifTasks: boolean;
  notifShare: boolean;
  notifAgenda: boolean;
}

export function SettingsClient({ user, takenColors }: { user: User; takenColors: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [color, setColor] = useState(user.color);
  const [hexInput, setHexInput] = useState(colorToHex(user.color));
  const [notifTasks, setNotifTasks] = useState(user.notifTasks);
  const [notifShare, setNotifShare] = useState(user.notifShare);
  const [notifAgenda, setNotifAgenda] = useState(user.notifAgenda);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const [profilePending, startProfileTransition] = useTransition();
  const [passPending, startPassTransition] = useTransition();
  const [notifPending, startNotifTransition] = useTransition();

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    startProfileTransition(async () => {
      const result = await updateProfile({ name, jobTitle: jobTitle || undefined, color });
      if (result.error) setProfileError(result.error);
      else {
        setProfileSuccess(true);
        router.refresh();
      }
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);
    startPassTransition(async () => {
      const fd = new FormData();
      fd.append("currentPassword", currentPassword);
      fd.append("newPassword", newPassword);
      fd.append("confirmPassword", confirmPassword);
      const result = await changePassword(fd);
      if (result?.error) setPassError(result.error);
      else {
        setPassSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  function handleNotifChange(key: "notifTasks" | "notifShare" | "notifAgenda", value: boolean) {
    const updates = { notifTasks, notifShare, notifAgenda, [key]: value };
    if (key === "notifTasks") setNotifTasks(value);
    if (key === "notifShare") setNotifShare(value);
    if (key === "notifAgenda") setNotifAgenda(value);
    startNotifTransition(async () => { await updateNotifications(updates); });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Instellingen</h1>
        <p className="text-sm text-slate-500 mt-1">Beheer je profiel en voorkeuren</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Profiel</h2>

        <div className="flex items-center gap-4 mb-6">
          <Avatar name={name} size="lg" color={color} />
          <div>
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
            <p className="text-xs text-slate-400 capitalize">
              {user.role === "admin" ? "Beheerder" : "Gebruiker"}
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Input
            label="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Functietitel"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Bijv. Content Creator"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Jouw kleur</label>

            {/* Preset swatches */}
            <div className="flex gap-2 flex-wrap mb-3">
              {colorOptions.map((c) => {
                const taken = takenColors.includes(c.value) && c.value !== color;
                const isActive = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { if (!taken) { setColor(c.value); setHexInput(c.hex); } }}
                    disabled={taken}
                    title={taken ? `${c.label} is al in gebruik` : c.label}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      isActive ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""
                    } ${taken ? "opacity-25 cursor-not-allowed" : "cursor-pointer"}`}
                  />
                );
              })}

              {/* Custom color preview swatch (shown when a hex is selected) */}
              {color.startsWith("#") && (
                <span
                  style={{ backgroundColor: color }}
                  className="w-7 h-7 rounded-full ring-2 ring-offset-2 ring-slate-400 scale-125"
                  title="Aangepaste kleur"
                />
              )}
            </div>

            {/* Color picker + hex/rgb input */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorToHex(color)}
                onChange={(e) => { setColor(e.target.value); setHexInput(e.target.value); }}
                className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                title="Kleurpicker"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setHexInput(val);
                  // Accept hex
                  if (isValidHex(val)) { setColor(val); return; }
                  // Accept rgb(r,g,b) or r,g,b
                  const hex = rgbToHex(val);
                  if (hex) setColor(hex);
                }}
                onBlur={() => setHexInput(colorToHex(color))}
                placeholder="#14b8a6 of 20, 184, 166"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Kies een vooraf ingestelde kleur of voer een hex/RGB-waarde in</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">E-mailadres</label>
            <input
              value={user.email}
              disabled
              className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
            />
          </div>

          {profileError && <p className="text-sm text-red-500">{profileError}</p>}
          {profileSuccess && (
            <p className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 size={14} /> Opgeslagen
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={profilePending}>
              {profilePending ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Wachtwoord wijzigen</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Huidig wachtwoord"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="Nieuw wachtwoord"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Bevestig nieuw wachtwoord"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {passError && <p className="text-sm text-red-500">{passError}</p>}
          {passSuccess && (
            <p className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 size={14} /> Wachtwoord gewijzigd
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={passPending}>
              {passPending ? "Wijzigen..." : "Wachtwoord wijzigen"}
            </Button>
          </div>
        </form>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Notificaties</h2>
        <div className="space-y-4">
          <Toggle
            checked={notifTasks}
            onChange={(v) => handleNotifChange("notifTasks", v)}
            label="Taakherinneringen"
            description="Ontvang een melding bij naderende deadlines"
          />
          <Toggle
            checked={notifShare}
            onChange={(v) => handleNotifChange("notifShare", v)}
            label="Deellinks"
            description="Melding 24u voor vervaldatum"
          />
          <Toggle
            checked={notifAgenda}
            onChange={(v) => handleNotifChange("notifAgenda", v)}
            label="Agendaherinneringen"
            description="Melding 1u voor afspraken"
          />
        </div>
      </div>
    </div>
  );
}

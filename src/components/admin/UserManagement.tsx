"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Shield, User } from "lucide-react";
import { createUser, updateUser, deleteUser } from "@/actions/admin/users";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const colorOptions = [
  { value: "teal", cls: "bg-teal-500", label: "Teal" },
  { value: "blue", cls: "bg-blue-500", label: "Blauw" },
  { value: "purple", cls: "bg-purple-500", label: "Paars" },
  { value: "red", cls: "bg-red-500", label: "Rood" },
  { value: "orange", cls: "bg-orange-500", label: "Oranje" },
  { value: "green", cls: "bg-green-500", label: "Groen" },
];

const colorDotClass: Record<string, string> = {
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
};

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string | null;
  color: string;
  createdAt: string;
}

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: UserItem | null;
  allUsers: UserItem[];
  onSuccess: (user: UserItem) => void;
}

function UserModal({ open, onClose, user, allUsers, onSuccess }: UserModalProps) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role ?? "user");
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");
  const [color, setColor] = useState(user?.color ?? "teal");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const takenColors = allUsers
    .filter((u) => u.id !== user?.id)
    .map((u) => u.color);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const data = { name, email, role, jobTitle: jobTitle || undefined, color, ...(password ? { password } : {}) };
      const result = isEdit
        ? await updateUser({ id: user!.id, ...data })
        : await createUser({ ...data, password });

      if (result.error) setError(result.error);
      else {
        onSuccess(result.user as any);
        onClose();
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Gebruiker bewerken" : "Nieuwe gebruiker"} width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="E-mailadres" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label={isEdit ? "Nieuw wachtwoord (leeg = niet wijzigen)" : "Wachtwoord"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEdit}
          placeholder={isEdit ? "Laat leeg om niet te wijzigen" : "Minimaal 8 tekens"}
        />
        <Input label="Functietitel" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <Select
          label="Rol"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: "user", label: "Gebruiker" },
            { value: "admin", label: "Beheerder" },
          ]}
        />
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">Gebruikerskleur</label>
          <div className="flex gap-2">
            {colorOptions.map((c) => {
              const taken = takenColors.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => !taken && setColor(c.value)}
                  disabled={taken}
                  title={taken ? `${c.label} is al in gebruik` : c.label}
                  className={`w-7 h-7 rounded-full ${c.cls} transition-transform ${
                    color === c.value ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : ""
                  } ${taken ? "opacity-25 cursor-not-allowed" : "cursor-pointer"}`}
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Bezette kleuren zijn uitgeschakeld</p>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>Annuleren</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Opslaan..." : isEdit ? "Opslaan" : "Aanmaken"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function UserManagement({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteUserItem, setDeleteUserItem] = useState<UserItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUserCreated(user: UserItem) {
    setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleUserUpdated(updated: UserItem) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleDeleteConfirm() {
    if (!deleteUserItem) return;
    startTransition(async () => {
      await deleteUser(deleteUserItem.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserItem.id));
      setDeleteUserItem(null);
    });
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-700">{users.length} gebruiker(s)</span>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Gebruiker toevoegen
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Naam</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Aangemaakt</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={u.name} size="sm" />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${colorDotClass[u.color] ?? "bg-teal-500"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{u.name}</p>
                      {u.jobTitle && <p className="text-xs text-slate-400">{u.jobTitle}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                    {u.role === "admin" ? <Shield size={10} /> : <User size={10} />}
                    {u.role === "admin" ? "Beheerder" : "Gebruiker"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {format(new Date(u.createdAt), "d MMM yyyy", { locale: nl })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditUser(u)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteUserItem(u)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserModal open={createOpen} onClose={() => setCreateOpen(false)} allUsers={users} onSuccess={handleUserCreated} />
      {editUser && (
        <UserModal
          key={editUser.id}
          open={true}
          onClose={() => setEditUser(null)}
          user={editUser}
          allUsers={users}
          onSuccess={handleUserUpdated}
        />
      )}
      {deleteUserItem && (
        <ConfirmDialog
          open={true}
          onClose={() => setDeleteUserItem(null)}
          onConfirm={handleDeleteConfirm}
          title="Gebruiker verwijderen"
          message={`Weet je zeker dat je "${deleteUserItem.name}" permanent wilt verwijderen?`}
          loading={isPending}
        />
      )}
    </>
  );
}

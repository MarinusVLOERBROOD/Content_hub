"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient, updateClient } from "@/actions/clients";

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: { id: string; name: string } | null;
}

export function ClientModal({ open, onClose, client }: ClientModalProps) {
  const [name, setName] = useState(client?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = !!client;
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateClient({ id: client!.id, name })
        : await createClient({ name });
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
        setName("");
        if (!isEdit && result.client?.slug) {
          router.push(`/bestanden/${result.client.slug}`);
        }
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Klant bewerken" : "Nieuwe klant"}
      width="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Klantnaam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. Acme BV"
          required
          error={error ?? undefined}
        />
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
            Annuleren
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Opslaan..." : isEdit ? "Opslaan" : "Aanmaken"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

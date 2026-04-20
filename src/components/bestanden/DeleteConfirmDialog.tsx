"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteClient } from "@/actions/clients";
import { deleteFile } from "@/actions/files";
import { useRouter } from "next/navigation";

interface DeleteClientDialogProps {
  open: boolean;
  onClose: () => void;
  client: { id: string; name: string };
}

export function DeleteClientDialog({ open, onClose, client }: DeleteClientDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      await deleteClient(client.id);
      onClose();
      router.push("/bestanden");
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Klant verwijderen"
      message={`Weet je zeker dat je "${client.name}" en alle bijbehorende bestanden permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
      confirmLabel="Permanent verwijderen"
      loading={isPending}
    />
  );
}

interface DeleteFileDialogProps {
  open: boolean;
  onClose: () => void;
  file: { id: string; name: string };
}

export function DeleteFileDialog({ open, onClose, file }: DeleteFileDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await deleteFile(file.id);
      onClose();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Bestand verwijderen"
      message={`Weet je zeker dat je "${file.name}" permanent wilt verwijderen?`}
      confirmLabel="Verwijderen"
      loading={isPending}
    />
  );
}

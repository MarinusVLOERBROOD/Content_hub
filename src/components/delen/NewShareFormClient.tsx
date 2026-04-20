"use client";

import { useState } from "react";
import { NewShareForm } from "./NewShareForm";

export function NewShareFormClient() {
  const [, setLastToken] = useState<string | null>(null);
  return <NewShareForm onCreated={(token) => setLastToken(token)} />;
}

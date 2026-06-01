"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
  onUndo?: () => void | Promise<void>;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    timers.current[id] = setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-sm px-4 py-3 bg-slate-800 text-white text-sm rounded-xl shadow-lg animate-slide-up"
          >
            <span className="flex-1">{t.message}</span>
            {t.onUndo && (
              <button
                onClick={async () => { await t.onUndo?.(); dismiss(t.id); }}
                className="shrink-0 text-teal-300 hover:text-teal-100 font-medium underline"
              >
                Ongedaan maken
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-slate-400 hover:text-white ml-1"
              aria-label="Sluiten"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

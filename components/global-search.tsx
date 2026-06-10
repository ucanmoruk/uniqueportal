"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileBarChart,
  Receipt,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AramaSonuc {
  type: "talep" | "teklif" | "rapor" | "fatura";
  id: number;
  baslik: string;
  altBaslik: string | null;
  durum: string | null;
  link: string;
}

const TYPE_META: Record<
  AramaSonuc["type"],
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  talep: { label: "Talep", icon: FileText, cls: "text-sky-600 dark:text-sky-400" },
  teklif: { label: "Teklif", icon: FileSpreadsheet, cls: "text-blue-600 dark:text-blue-400" },
  rapor: { label: "Rapor", icon: FileBarChart, cls: "text-emerald-600 dark:text-emerald-400" },
  fatura: { label: "Fatura", icon: Receipt, cls: "text-amber-600 dark:text-amber-400" },
};

/**
 * Global arama — ⌘K / Ctrl+K veya tetikleyici butonla açılır.
 * Talep, teklif, rapor ve faturalarda canlı arama yapar (/api/ara).
 */
export function GlobalSearch({ variant = "sidebar" }: { variant?: "sidebar" | "topbar" }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<AramaSonuc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => setMounted(true), []);

  // ⌘K / Ctrl+K kısayolu
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setResults([]);
      setActiveIdx(0);
    }
  }, [open]);

  // Debounced arama
  React.useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/ara?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIdx(0);
      } catch {
        /* abort veya hata */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = React.useCallback(
    (r: AramaSonuc) => {
      setOpen(false);
      router.push(r.link);
    },
    [router]
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx]);
    }
  }

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent/70 transition-colors"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Ara…</span>
        <kbd className="hidden lg:inline text-[10px] font-mono bg-background/50 border border-sidebar-border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ara"
        className="inline-flex items-center justify-center size-9 rounded-md hover:bg-accent text-muted-foreground"
      >
        <Search className="size-5" />
      </button>
    );

  const overlay =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh] px-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="w-full max-w-xl bg-popover text-popover-foreground rounded-xl border shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-b">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Talep, teklif, rapor veya fatura ara…"
              className="w-full py-3.5 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            {loading && (
              <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {q.trim().length < 2 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aramak için en az 2 karakter yazın.
              </p>
            ) : results.length === 0 && !loading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                &quot;{q}&quot; için sonuç bulunamadı.
              </p>
            ) : (
              <ul className="py-1">
                {results.map((r, idx) => {
                  const meta = TYPE_META[r.type];
                  const Icon = meta.icon;
                  return (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => go(r)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          idx === activeIdx ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", meta.cls)} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {r.baslik}
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {meta.label}
                            </span>
                          </div>
                          {r.altBaslik && (
                            <div className="text-xs text-muted-foreground truncate">
                              {r.altBaslik}
                            </div>
                          )}
                        </div>
                        {r.durum && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                            {r.durum}
                          </span>
                        )}
                        {idx === activeIdx && (
                          <CornerDownLeft className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-3 px-4 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> gezin</span>
            <span><kbd className="font-mono">↵</kbd> aç</span>
            <span><kbd className="font-mono">esc</kbd> kapat</span>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {trigger}
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}

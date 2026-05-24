"use client";

import * as React from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FirmaOption } from "@/lib/repositories/firma";

interface Props {
  options: FirmaOption[];
  value: number | null;
  onChange: (id: number | null, firma: FirmaOption | null) => void;
  placeholder?: string;
  className?: string;
  /** Müşteri / Proje / Admin / Plasiyer filtresi */
  turFilter?: string[];
}

export function FirmaCombobox({
  options,
  value,
  onChange,
  placeholder = "Firma ara…",
  className,
  turFilter,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredOptions = React.useMemo(() => {
    const base = turFilter
      ? options.filter((o) => turFilter.includes(o.Tur))
      : options;
    if (!query.trim()) return base.slice(0, 30);
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return base
      .filter(
        (o) =>
          (o.Firma_Adi ?? "").toLocaleLowerCase("tr-TR").includes(q) ||
          (o.Kod ?? "").toLocaleLowerCase("tr-TR").includes(q)
      )
      .slice(0, 50);
  }, [options, query, turFilter]);

  const selected = value != null ? options.find((o) => o.ID === value) : null;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 border border-input bg-background px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selected ? (
            <>
              <span className="font-medium">{selected.Firma_Adi}</span>
              <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                {selected.Kod} · {selected.Tur}
              </span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected && (
            <X
              className="size-4 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null, null);
              }}
            />
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 border bg-popover shadow-lg max-h-96 flex flex-col">
          <div className="relative border-b">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Firma kodu veya adıyla ara…"
              autoFocus
              className="h-10 w-full bg-transparent pl-8 pr-3 text-sm focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Sonuç bulunamadı.
              </div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((o) => {
                  const isSelected = o.ID === value;
                  return (
                    <li key={o.ID}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(o.ID, o);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={cn(
                          "w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                          isSelected && "bg-accent/60"
                        )}
                      >
                        <Check
                          className={cn(
                            "size-4 mt-0.5 shrink-0",
                            isSelected ? "opacity-100 text-primary" : "opacity-0"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{o.Firma_Adi}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {o.Kod} · {o.Tur}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-t">
              {filteredOptions.length} sonuç / {options.length} firma
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

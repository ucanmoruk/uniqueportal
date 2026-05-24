"use client";

import * as React from "react";
import { useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Loader2,
  Send,
  Search,
  X,
  Check,
  FileSpreadsheet,
  FileText,
  Receipt,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { yeniDestekAction, type YeniDestekState } from "./actions";
import type { UserRelatedItem } from "@/lib/repositories/destek";

const initial: YeniDestekState = {};

const TYPE_ICON: Record<
  UserRelatedItem["type"],
  React.ComponentType<{ className?: string }>
> = {
  Teklif: FileSpreadsheet,
  Rapor: FileText,
  Fatura: Receipt,
};

export function YeniDestekForm({ items }: { items: UserRelatedItem[] }) {
  const [state, formAction, pending] = useActionState(yeniDestekAction, initial);
  const [ilgili, setIlgili] = React.useState<UserRelatedItem | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<
    "all" | "Teklif" | "Rapor" | "Fatura"
  >("all");
  const [query, setQuery] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = React.useMemo(() => {
    let arr = items;
    if (typeFilter !== "all") arr = arr.filter((i) => i.type === typeFilter);
    if (query.trim()) {
      const q = query.toLocaleLowerCase("tr-TR").trim();
      arr = arr.filter(
        (i) =>
          i.label.toLocaleLowerCase("tr-TR").includes(q) ||
          i.subtitle.toLocaleLowerCase("tr-TR").includes(q)
      );
    }
    return arr.slice(0, 100);
  }, [items, typeFilter, query]);

  const counts = React.useMemo(
    () => ({
      Teklif: items.filter((i) => i.type === "Teklif").length,
      Rapor: items.filter((i) => i.type === "Rapor").length,
      Fatura: items.filter((i) => i.type === "Fatura").length,
    }),
    [items]
  );

  const Icon = ilgili ? TYPE_ICON[ilgili.type] : Paperclip;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Talep Bilgileri</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <input
            type="hidden"
            name="ilgili"
            value={
              ilgili
                ? JSON.stringify({
                    type: ilgili.type,
                    id: ilgili.id,
                    label: ilgili.label,
                  })
                : ""
            }
          />

          <div className="space-y-1.5">
            <Label htmlFor="baslik">
              Konu Başlığı <span className="text-destructive">*</span>
            </Label>
            <Input
              id="baslik"
              name="baslik"
              placeholder="Örn: Rapor sonucumun gecikme nedeni"
              required
              maxLength={255}
            />
          </div>

          {/* İlgili kayıt picker */}
          <div className="space-y-1.5">
            <Label>İlgili Kayıt (opsiyonel)</Label>
            <div ref={pickerRef} className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className={cn(
                  "flex h-10 w-full items-center justify-between gap-2 border border-input bg-background px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:border-primary",
                  !ilgili && "text-muted-foreground"
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  {ilgili ? (
                    <>
                      <span className="text-[10px] uppercase tracking-wider bg-primary-subtle text-primary px-1.5 py-0.5">
                        {ilgili.type}
                      </span>
                      <span className="font-medium truncate">{ilgili.label}</span>
                      {ilgili.subtitle && (
                        <span className="text-muted-foreground truncate">
                          · {ilgili.subtitle}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Teklif, Rapor veya Fatura seçin…</span>
                  )}
                </span>
                {ilgili && (
                  <X
                    className="size-4 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIlgili(null);
                    }}
                  />
                )}
              </button>

              {pickerOpen && (
                <div className="absolute z-30 mt-1 left-0 right-0 border bg-popover shadow-lg max-h-96 flex flex-col">
                  <div className="flex items-center gap-2 border-b">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ara…"
                        className="h-10 w-full bg-transparent pl-8 pr-3 text-sm focus:outline-none"
                      />
                    </div>
                    <Select
                      value={typeFilter}
                      onChange={(e) =>
                        setTypeFilter(
                          e.target.value as typeof typeFilter
                        )
                      }
                      className="w-32 border-0 border-l rounded-none focus-visible:ring-0"
                    >
                      <option value="all">Hepsi ({items.length})</option>
                      <option value="Teklif">Teklif ({counts.Teklif})</option>
                      <option value="Rapor">Rapor ({counts.Rapor})</option>
                      <option value="Fatura">Fatura ({counts.Fatura})</option>
                    </Select>
                  </div>

                  <div className="overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Sonuç yok.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {filtered.map((it) => {
                          const ItIcon = TYPE_ICON[it.type];
                          const isSel =
                            ilgili?.type === it.type && ilgili?.id === it.id;
                          return (
                            <li key={`${it.type}-${it.id}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setIlgili(it);
                                  setPickerOpen(false);
                                  setQuery("");
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                                  isSel && "bg-accent/60"
                                )}
                              >
                                <Check
                                  className={cn(
                                    "size-4 shrink-0",
                                    isSel
                                      ? "opacity-100 text-primary"
                                      : "opacity-0"
                                  )}
                                />
                                <ItIcon className="size-4 shrink-0 text-muted-foreground" />
                                <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 shrink-0">
                                  {it.type}
                                </span>
                                <span className="font-medium truncate">
                                  {it.label}
                                </span>
                                {it.subtitle && (
                                  <span className="text-muted-foreground text-xs truncate min-w-0">
                                    {it.subtitle}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-t">
                    {filtered.length} sonuç
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Talebiniz belirli bir teklif, rapor veya fatura ile ilgiliyse
              bağlayın — destek ekibimiz daha hızlı yanıt verir.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aciklama">
              Açıklama <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="aciklama"
              name="aciklama"
              placeholder="Sorununuzu detaylı şekilde anlatın…"
              required
              rows={6}
              maxLength={5000}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Gönderiliyor…
                </>
              ) : (
                <>
                  <Send /> Talep Oluştur
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

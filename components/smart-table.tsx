"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Search,
  X,
} from "lucide-react";

export interface SmartColumn<T> {
  /** Sıralama / arama / sayfalama için stabil anahtar */
  key: string;
  /** Başlık metni */
  header: string;
  /** Arama/sıralama için ham değer — string/number döner */
  accessor?: (row: T) => string | number | null | undefined | Date;
  /** Hücre render */
  cell?: (row: T) => React.ReactNode;
  /** Hizalama */
  align?: "left" | "right" | "center";
  /** Sıralama açık mı? Varsayılan true */
  sortable?: boolean;
  /** Aramada bu kolon kullanılsın mı? Varsayılan true */
  searchable?: boolean;
  /** Genişlik sınıfı */
  className?: string;
  /** Türü (filter yok, tip ipucu için) */
  type?: "text" | "number" | "date";
}

interface SmartTableProps<T> {
  rows: T[];
  columns: SmartColumn<T>[];
  rowKey: (row: T, idx: number) => string | number;
  /** Arama placeholder */
  searchPlaceholder?: string;
  /** Başlangıçta sayfa boyutu */
  pageSize?: number;
  /** Bütün satırlar gizleninceye dair mesaj */
  emptyMessage?: string;
  /** Toolbar'da gösterilecek ek butonlar */
  toolbar?: React.ReactNode;
  /** Tablo başlığı (toolbar üstünde) */
  title?: string;
  /** Açıklama (örn: "Toplam X kayıt") */
  description?: string;
  /** Satır id'sine göre detay linki üretirse, satır tıklaması bunu açar */
  rowHref?: (row: T) => string | undefined;
}

type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

function toComparable(v: unknown): string | number {
  if (v == null) return "";
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return String(v).toLocaleLowerCase("tr-TR");
}

export function SmartTable<T extends object>({
  rows,
  columns,
  rowKey,
  searchPlaceholder = "Tabloda ara…",
  pageSize: initialPageSize = 25,
  emptyMessage = "Kayıt bulunamadı.",
  toolbar,
  title,
  description,
  rowHref,
}: SmartTableProps<T>) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  // Filter
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((row) =>
      columns.some((c) => {
        if (c.searchable === false) return false;
        const v = c.accessor ? c.accessor(row) : undefined;
        const str = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
        return str.toLocaleLowerCase("tr-TR").includes(term);
      })
    );
  }, [rows, search, columns]);

  // Sort
  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.accessor) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = toComparable(col.accessor!(a));
      const bv = toComparable(col.accessor!(b));
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir, columns]);

  // Paginate
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  function toggleSort(col: SmartColumn<T>) {
    if (col.sortable === false || !col.accessor) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-3">
      {(title || description || toolbar) && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          {(title || description) && (
            <div>
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">
            {total === 0
              ? "Sonuç yok"
              : `${start + 1}–${Math.min(start + pageSize, total)} / ${total}`}
          </span>
          <div className="w-24">
            <Select
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Sayfa boyutu"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} / sf
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                {columns.map((c) => {
                  const sortable = c.sortable !== false && !!c.accessor;
                  const isSorted = sortKey === c.key;
                  return (
                    <th
                      key={c.key}
                      className={cn(
                        "px-4 py-2.5 font-medium whitespace-nowrap select-none",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        sortable && "cursor-pointer hover:text-foreground",
                        c.className
                      )}
                      onClick={() => sortable && toggleSort(c)}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          c.align === "right" && "justify-end"
                        )}
                      >
                        {c.header}
                        {sortable &&
                          (isSorted ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          ))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    {search ? (
                      <>
                        <span className="block">
                          &quot;<span className="font-medium">{search}</span>&quot;
                          için sonuç bulunamadı.
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setSearch("")}
                        >
                          Aramayı temizle
                        </Button>
                      </>
                    ) : (
                      emptyMessage
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, idx) => {
                  const href = rowHref?.(row);
                  return (
                    <tr
                      key={rowKey(row, start + idx)}
                      className={cn(
                        "border-t",
                        href
                          ? "hover:bg-accent/40 cursor-pointer"
                          : "hover:bg-accent/30"
                      )}
                      onClick={
                        href
                          ? (e) => {
                              // İç tıklamalı linkler / butonlar varsa yönlendirme yapma
                              const target = e.target as HTMLElement;
                              if (target.closest("a,button")) return;
                              if (typeof window !== "undefined") {
                                window.location.href = href;
                              }
                            }
                          : undefined
                      }
                    >
                      {columns.map((c) => {
                        const val = c.cell
                          ? c.cell(row)
                          : ((row as unknown as Record<string, React.ReactNode>)[
                              c.key
                            ] ?? null);
                        return (
                          <td
                            key={c.key}
                            className={cn(
                              "px-4 py-2.5",
                              c.align === "right" && "text-right",
                              c.align === "center" && "text-center",
                              c.className
                            )}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <div className="text-muted-foreground">
            Sayfa {safePage} / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              aria-label="İlk sayfa"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Önceki"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Sonraki"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Son sayfa"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

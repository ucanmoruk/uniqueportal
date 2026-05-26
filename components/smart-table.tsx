"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  key: string;
  header: string;
  accessor?: (row: T) => string | number | null | undefined | Date;
  cell?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
}

interface SmartTableProps<T> {
  rows: T[];
  columns: SmartColumn<T>[];
  rowKey: (row: T, idx: number) => string | number;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
  rowHref?: (row: T) => string | undefined;
  /** Çoklu seçim aktif edilirse satır başına checkbox kolonu eklenir. */
  selectable?: boolean;
  /** Seçim değiştiğinde tetiklenir. Seçili satırların tamamı (filtre öncesi). */
  onSelectionChange?: (selectedRows: T[]) => void;
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
  rowHref,
  selectable = false,
  onSelectionChange,
}: SmartTableProps<T>) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string | number>>(
    () => new Set()
  );

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

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

  // Seçim helper'ları
  const rowKeysAll = React.useMemo(
    () => rows.map((r, i) => rowKey(r, i)),
    [rows, rowKey]
  );
  const visibleKeys = React.useMemo(
    () => sorted.map((r) => rowKeysAll[rows.indexOf(r)]),
    [sorted, rowKeysAll, rows]
  );
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k));
  const someVisibleSelected =
    !allVisibleSelected && visibleKeys.some((k) => selectedKeys.has(k));

  function toggleRow(k: string | number) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleKeys.forEach((k) => next.delete(k));
      } else {
        visibleKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  }

  // Selection değişimini parent'a haber ver
  React.useEffect(() => {
    if (!onSelectionChange) return;
    const selectedRows = rows.filter((r, i) =>
      selectedKeys.has(rowKey(r, i))
    );
    onSelectionChange(selectedRows);
    // selectedKeys değişimi yeterli — rows referansı stable kabul ediliyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKeys]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between px-4 py-3 border-b bg-muted/30">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 pr-8 bg-background"
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

        <div className="flex items-center gap-3 text-sm">
          {toolbar}
          <span className="hidden sm:inline text-muted-foreground tabular-nums whitespace-nowrap">
            {total === 0
              ? "0 sonuç"
              : `${start + 1}–${Math.min(start + pageSize, total)} / ${total}`}
          </span>
          <div className="w-28">
            <Select
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Sayfa boyutu"
              className="bg-background"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} satır
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-muted-foreground border-b">
            <tr className="text-left">
              {selectable && (
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    aria-label="Tümünü seç"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    className="size-4"
                  />
                </th>
              )}
              {columns.map((c) => {
                const sortable = c.sortable !== false && !!c.accessor;
                const isSorted = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-2.5 font-medium text-xs uppercase tracking-wide whitespace-nowrap select-none",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      sortable && "cursor-pointer hover:text-foreground transition-colors",
                      c.className
                    )}
                    onClick={() => sortable && toggleSort(c)}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        c.align === "right" && "justify-end",
                        c.align === "center" && "justify-center"
                      )}
                    >
                      {c.header}
                      {sortable &&
                        (isSorted ? (
                          sortDir === "asc" ? (
                            <ChevronUp className="size-3.5 text-foreground" />
                          ) : (
                            <ChevronDown className="size-3.5 text-foreground" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-30" />
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
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-16 text-center text-muted-foreground"
                >
                  {search ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>
                        &quot;<span className="font-medium text-foreground">
                          {search}
                        </span>&quot; için sonuç bulunamadı.
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearch("")}
                      >
                        Aramayı temizle
                      </Button>
                    </div>
                  ) : (
                    emptyMessage
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const href = rowHref?.(row);
                const key = rowKey(row, start + idx);
                const isSelected = selectable && selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      isSelected && "bg-primary-subtle/30",
                      href
                        ? "hover:bg-accent/40 cursor-pointer"
                        : "hover:bg-accent/20"
                    )}
                    onClick={
                      href
                        ? (e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest("a,button,input,select,textarea,label")
                            )
                              return;
                            router.push(href);
                          }
                        : undefined
                    }
                  >
                    {selectable && (
                      <td
                        className="px-3 py-3 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label="Satırı seç"
                          checked={selectedKeys.has(key)}
                          onChange={() => toggleRow(key)}
                          className="size-4"
                        />
                      </td>
                    )}
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
                            "px-4 py-3",
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/30 text-sm">
          <div className="text-muted-foreground">
            Sayfa <span className="font-medium text-foreground">{safePage}</span>{" "}
            / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              aria-label="İlk sayfa"
              className="bg-background"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Önceki"
              className="bg-background"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Sonraki"
              className="bg-background"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Son sayfa"
              className="bg-background"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

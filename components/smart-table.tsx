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
  ListFilter,
  Check,
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
  /**
   * Tanımlıysa kolon başlığının yanında değer-bazlı bir filtre dropdown'u
   * gösterilir. Değerler bu fonksiyonla çıkarılır (null → "—").
   */
  filterable?: boolean;
  /** filterable kolonun filtre değerini üretir (yoksa accessor kullanılır). */
  filterValue?: (row: T) => string | null | undefined;
}

interface SmartTableProps<T> {
  rows: T[];
  columns: SmartColumn<T>[];
  rowKey: (row: T, idx: number) => string | number;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: React.ReactNode;
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

/** Tek bir kolon için çoklu-seçim filtre dropdown'u. */
function FacetFilter({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  if (values.length === 0) return null;
  const count = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
          count > 0
            ? "border-primary/40 bg-primary-subtle/40 text-foreground"
            : "bg-background hover:bg-accent text-muted-foreground"
        )}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
            {count}
          </span>
        )}
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 min-w-[12rem] max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg py-1">
          {values.map((v) => {
            const isSel = selected.has(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => onToggle(v)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent"
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center size-4 rounded border shrink-0",
                    isSel
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {isSel && <Check className="size-3" />}
                </span>
                <span className="truncate">{v}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  // Kolon bazlı seçili filtre değerleri (key → seçili değer kümesi)
  const [filters, setFilters] = React.useState<Record<string, Set<string>>>({});
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string | number>>(
    () => new Set()
  );

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, filters]);

  // Filtrelenebilir kolonlar ve her biri için benzersiz değerler
  const filterableCols = React.useMemo(
    () => columns.filter((c) => c.filterable),
    [columns]
  );

  const filterValueOf = React.useCallback(
    (c: SmartColumn<T>, row: T): string => {
      const raw = c.filterValue
        ? c.filterValue(row)
        : c.accessor
          ? c.accessor(row)
          : undefined;
      if (raw == null || raw === "") return "—";
      return raw instanceof Date ? raw.toISOString() : String(raw);
    },
    []
  );

  const facetValues = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const c of filterableCols) {
      const set = new Set<string>();
      for (const row of rows) set.add(filterValueOf(c, row));
      map[c.key] = [...set].sort((a, b) =>
        a.localeCompare(b, "tr-TR")
      );
    }
    return map;
  }, [filterableCols, rows, filterValueOf]);

  const filtered = React.useMemo(() => {
    let result = rows;

    // 1) Facet filtreleri
    const activeFilterKeys = Object.keys(filters).filter(
      (k) => filters[k] && filters[k].size > 0
    );
    if (activeFilterKeys.length > 0) {
      result = result.filter((row) =>
        activeFilterKeys.every((key) => {
          const col = columns.find((c) => c.key === key);
          if (!col) return true;
          return filters[key].has(filterValueOf(col, row));
        })
      );
    }

    // 2) Metin araması
    if (search.trim()) {
      const term = search.trim().toLocaleLowerCase("tr-TR");
      result = result.filter((row) =>
        columns.some((c) => {
          if (c.searchable === false) return false;
          const v = c.accessor ? c.accessor(row) : undefined;
          const str = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
          return str.toLocaleLowerCase("tr-TR").includes(term);
        })
      );
    }

    return result;
  }, [rows, search, columns, filters, filterValueOf]);

  function toggleFilter(colKey: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev };
      const set = new Set(next[colKey] ?? []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) delete next[colKey];
      else next[colKey] = set;
      return next;
    });
  }

  function clearFilters() {
    setFilters({});
  }

  const activeFilterCount = Object.values(filters).reduce(
    (acc, s) => acc + s.size,
    0
  );

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

      {/* Filtre çubuğu — yalnızca filtrelenebilir kolon varsa */}
      {filterableCols.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b bg-background/50">
          <ListFilter className="size-4 text-muted-foreground shrink-0" />
          {filterableCols.map((c) => (
            <FacetFilter
              key={c.key}
              label={c.header}
              values={facetValues[c.key] ?? []}
              selected={filters[c.key] ?? new Set()}
              onToggle={(v) => toggleFilter(c.key, v)}
            />
          ))}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" /> Filtreleri temizle ({activeFilterCount})
            </button>
          )}
        </div>
      )}

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

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
  /** Mobile kart görünümünde gizle (örn: ikincil bilgiler) */
  hideOnMobileCard?: boolean;
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
}

type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

function toComparable(v: unknown): string | number {
  if (v == null) return "";
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return String(v).toLocaleLowerCase("tr-TR");
}

function isActionColumn<T>(c: SmartColumn<T>) {
  return c.header === "" && (c.sortable === false || !c.accessor);
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
}: SmartTableProps<T>) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

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

  // Mobil kart için kolonları ayır: ilk veri kolonu başlık, son action sağ üst,
  // diğerleri label/value
  const actionCol = columns.find(isActionColumn);
  const dataCols = columns.filter((c) => !isActionColumn(c));
  const cardPrimary = dataCols[0];
  const cardRest = dataCols.slice(1).filter((c) => !c.hideOnMobileCard);

  return (
    <div className="border bg-card text-card-foreground overflow-hidden shadow-sm">
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

      {/* Mobile card list (< md) */}
      <div className="md:hidden">
        {pageRows.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            {search ? (
              <>
                <div className="mb-2">
                  &quot;<span className="font-medium text-foreground">{search}</span>&quot;
                  için sonuç yok.
                </div>
                <Button variant="link" size="sm" onClick={() => setSearch("")}>
                  Aramayı temizle
                </Button>
              </>
            ) : (
              emptyMessage
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {pageRows.map((row, idx) => {
              const href = rowHref?.(row);
              const handleClick =
                href != null
                  ? (e: React.MouseEvent | React.KeyboardEvent) => {
                      const t = e.target as HTMLElement;
                      if (t.closest("a,button,input,select,textarea")) return;
                      router.push(href);
                    }
                  : undefined;

              return (
                <li
                  key={rowKey(row, start + idx)}
                  className={cn(
                    "p-4 space-y-3",
                    href && "active:bg-accent/40 cursor-pointer"
                  )}
                  onClick={handleClick}
                  onKeyDown={(e) => {
                    if (handleClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleClick(e);
                    }
                  }}
                  role={href ? "button" : undefined}
                  tabIndex={href ? 0 : undefined}
                >
                  {/* Üst satır: birincil değer + action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                        {cardPrimary?.header}
                      </div>
                      <div className="text-base font-semibold leading-tight">
                        {cardPrimary
                          ? cardPrimary.cell
                            ? cardPrimary.cell(row)
                            : ((row as unknown as Record<string, React.ReactNode>)[
                                cardPrimary.key
                              ] ?? "—")
                          : "—"}
                      </div>
                    </div>
                    {actionCol && (
                      <div className="shrink-0">
                        {actionCol.cell ? actionCol.cell(row) : null}
                      </div>
                    )}
                  </div>

                  {/* Diğer alanlar */}
                  {cardRest.length > 0 && (
                    <dl className="grid grid-cols-1 gap-1.5">
                      {cardRest.map((c) => {
                        const val = c.cell
                          ? c.cell(row)
                          : ((row as unknown as Record<string, React.ReactNode>)[
                              c.key
                            ] ?? null);
                        return (
                          <div
                            key={c.key}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                              {c.header}
                            </dt>
                            <dd className="text-sm text-right min-w-0 break-words">
                              {val}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Desktop table (md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-muted-foreground border-b">
            <tr className="text-left">
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
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-muted-foreground"
                >
                  {search ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>
                        &quot;<span className="font-medium text-foreground">
                          {search}
                        </span>&quot; için sonuç bulunamadı.
                      </span>
                      <Button variant="link" size="sm" onClick={() => setSearch("")}>
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
                return (
                  <tr
                    key={rowKey(row, start + idx)}
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      href
                        ? "hover:bg-accent/40 cursor-pointer"
                        : "hover:bg-accent/20"
                    )}
                    onClick={
                      href
                        ? (e) => {
                            const target = e.target as HTMLElement;
                            if (
                              target.closest("a,button,input,select,textarea")
                            )
                              return;
                            router.push(href);
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
            <span className="hidden sm:inline">Sayfa </span>
            <span className="font-medium text-foreground">{safePage}</span> /{" "}
            {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              aria-label="İlk sayfa"
              className="bg-background hidden sm:inline-flex"
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
              className="bg-background hidden sm:inline-flex"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

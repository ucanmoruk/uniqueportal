import * as React from "react";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  rows: T[];
  columns: ColumnDef<T>[];
  emptyMessage?: string;
  rowKey: (row: T, idx: number) => string | number;
  className?: string;
}

export function DataTable<T extends object>({
  rows,
  columns,
  emptyMessage = "Kayıt bulunamadı.",
  rowKey,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-2.5 font-medium whitespace-nowrap",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={rowKey(row, idx)} className="border-t hover:bg-accent/30">
                {columns.map((c) => {
                  const val = c.cell
                    ? c.cell(row)
                    : ((row as unknown as Record<string, React.ReactNode>)[c.key] ??
                      null);
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

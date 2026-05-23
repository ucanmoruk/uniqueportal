import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap border",
  {
    variants: {
      tone: {
        default: "bg-surface-tertiary text-muted-foreground border-border",
        primary: "bg-primary-subtle text-primary border-primary/30",
        success:
          "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
        warning:
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900",
        danger:
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900",
        info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const v = (value ?? "").trim();
  const lower = v.toLowerCase();
  let tone: BadgeProps["tone"] = "default";

  if (!v) return <Badge tone="default">—</Badge>;
  if (
    lower.includes("onay") ||
    lower.includes("aktif") ||
    lower.includes("ödendi") ||
    lower.includes("yanıtland") ||
    lower.includes("tamamland")
  )
    tone = "success";
  else if (lower.includes("yeni")) tone = "info";
  else if (
    lower.includes("bekle") ||
    lower.includes("açık") ||
    lower.includes("müşteri")
  )
    tone = "warning";
  else if (
    lower.includes("pasif") ||
    lower.includes("iptal") ||
    lower.includes("red")
  )
    tone = "danger";

  return <Badge tone={tone}>{v}</Badge>;
}

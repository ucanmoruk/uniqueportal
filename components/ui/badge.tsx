import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        default: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        warning:
          "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
        danger:
          "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
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

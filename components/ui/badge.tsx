import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * UNIQUE Badge — pill (radius-full) durum etiketleri.
 *
 * Block:    .uq-badge
 * Modifier: --active | --pending | --waiting | --tag-{blue|red|orange|green|purple}
 *
 * Eski tone= API'si UNIQUE token modifier'larına haritalandı.
 */
const badgeVariants = cva("uq-badge", {
  variants: {
    tone: {
      default: "uq-badge--tag-blue uq-badge--neutral",
      primary: "uq-badge--pending",
      success: "uq-badge--active",
      warning: "uq-badge--tag-orange",
      danger: "uq-badge--tag-red",
      info: "uq-badge--tag-blue",
    },
  },
  defaultVariants: { tone: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const v = (value ?? "").trim();
  const lower = v.toLocaleLowerCase("tr");
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
    lower.includes("müşteri") ||
    lower.includes("analiz")
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

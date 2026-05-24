import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * UNIQUE ANALYSE logo komponenti.
 *
 * İki katman:
 *  1. 8-uçlu yıldız işareti (inline SVG, currentColor — token üzerinden boyanır)
 *  2. UNIQUE (text-primary) + ANALYSE (text-brand) tipografi
 *
 * Resmî asset için: public/unique-logo.svg dosyasını koyup
 * `variant="image"` prop'u ile değiştirmek mümkün; şimdilik SVG inline.
 *
 * Kullanım:
 *   <UniqueLogo />                  // default — icon + UNIQUE ANALYSE
 *   <UniqueLogo size="lg" />        // büyük versiyon
 *   <UniqueLogo wordmark="only" />  // sadece yazı
 *   <UniqueLogo wordmark="icon" />  // sadece ikon
 */

interface UniqueLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  wordmark?: "full" | "icon" | "wordmark";
  /** Yazı rengini "inherit" yap → koyu zeminlerde tek renk */
  monochrome?: boolean;
}

const SIZE_MAP: Record<NonNullable<UniqueLogoProps["size"]>, {
  icon: string;
  text: string;
  gap: string;
}> = {
  sm: { icon: "size-6", text: "text-sm", gap: "gap-2" },
  md: { icon: "size-8", text: "text-base", gap: "gap-2.5" },
  lg: { icon: "size-10", text: "text-xl", gap: "gap-3" },
  xl: { icon: "size-14", text: "text-3xl", gap: "gap-4" },
};

export function UniqueLogo({
  size = "md",
  wordmark = "full",
  monochrome = false,
  className,
  ...rest
}: UniqueLogoProps) {
  const s = SIZE_MAP[size];

  const showIcon = wordmark === "full" || wordmark === "icon";
  const showText = wordmark === "full" || wordmark === "wordmark";

  return (
    <div
      className={cn("inline-flex items-center", s.gap, className)}
      aria-label="UNIQUE ANALYSE"
      {...rest}
    >
      {showIcon && <UniqueIcon className={cn(s.icon, "shrink-0")} />}
      {showText && (
        <span
          className={cn(
            "uq-logo__wordmark font-bold tracking-tight whitespace-nowrap",
            s.text
          )}
        >
          <span className={monochrome ? undefined : "text-foreground"}>
            UNIQUE{" "}
          </span>
          <span className={monochrome ? undefined : "text-primary"}>
            ANALYSE
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * 8-uçlu yıldız (UNIQUE marka ikonu).
 *
 * 8 blade radial olarak yerleştirilmiş. Her blade dış ucunda V-notch
 * (içeri doğru kerteriz). currentColor kullanır — Tailwind text-* ile
 * boyanabilir.
 */
export function UniqueIcon({
  className,
  ...rest
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* 8 adet blade, her biri 45° farkla döndürülmüş.
          Tek blade tanımı (yukarı yönlü):
          - dış uçta V-notch
          - genişleyen orta gövde
          - merkezde tek noktada birleşir
       */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <polygon
            points="
              40,4
              50,20
              60,4
              62,32
              50,50
              38,32
            "
          />
        </g>
      ))}
    </svg>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * UNIQUE ANALYSE logo komponenti.
 *
 * Birincil görsel: `public/unique-logo.png` (resmî marka asset'i).
 * Resim mevcut değilse veya 404 dönerse SVG fallback'e otomatik düşer.
 *
 * Resmi asset'i koymak için:
 *   /Users/oguzhan/Desktop/unique-portal-next/public/unique-logo.png
 */

interface UniqueLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  wordmark?: "full" | "icon" | "wordmark";
  /** Koyu zeminde kullanılacaksa: beyaz UNIQUE + açık indigo ANALYSE. */
  inverted?: boolean;
}

const SIZE_MAP: Record<NonNullable<UniqueLogoProps["size"]>, {
  height: string;
  iconBox: string;
  text: string;
  gap: string;
}> = {
  // spacing-6 = 24, spacing-8 = 32, spacing-10 = 40, spacing-12 = 48,
  // spacing-16 = 64, spacing-20 = 80 (UNIQUE token scale)
  sm:    { height: "h-6",  iconBox: "size-6",  text: "text-sm",   gap: "gap-2" },
  md:    { height: "h-8",  iconBox: "size-8",  text: "text-base", gap: "gap-2.5" },
  lg:    { height: "h-12", iconBox: "size-12", text: "text-xl",   gap: "gap-3" },
  xl:    { height: "h-16", iconBox: "size-16", text: "text-3xl",  gap: "gap-4" },
  "2xl": { height: "h-20", iconBox: "size-20", text: "text-4xl",  gap: "gap-4" },
};

export function UniqueLogo({
  size = "md",
  wordmark = "full",
  inverted = false,
  className,
  ...rest
}: UniqueLogoProps) {
  const s = SIZE_MAP[size];
  const [imgFailed, setImgFailed] = React.useState(false);

  const isIconOnly = wordmark === "icon";
  const isWordmarkOnly = wordmark === "wordmark";

  // Inverted modunda image kullanma — siyah yazılı PNG koyu zeminde yanıltıcı.
  // SVG + custom renkli HTML wordmark üzerinden render et.
  if (!inverted && !imgFailed && !isWordmarkOnly) {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        aria-label="UNIQUE ANALYSE"
        {...rest}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/unique-logo.jpeg"
          alt="UNIQUE ANALYSE"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src.endsWith(".jpeg")) {
              el.src = "/unique-logo.png";
            } else if (el.src.endsWith(".png")) {
              el.src = "/unique-logo.svg";
            } else {
              setImgFailed(true);
            }
          }}
          className={cn(
            isIconOnly ? s.iconBox : s.height,
            "w-auto object-contain select-none"
          )}
          draggable={false}
        />
      </div>
    );
  }

  // SVG + HTML wordmark (inverted veya image fallback)
  const iconColorClass = inverted
    ? "text-[color:var(--uq-color-neutral-0)]"
    : "text-foreground";
  const uniqueTextClass = inverted
    ? "text-[color:var(--uq-color-neutral-0)]"
    : "text-foreground";
  const analyseTextClass = inverted
    ? "text-[color:var(--uq-color-signal-blue-100)]"
    : "text-primary";

  return (
    <div
      className={cn("inline-flex items-center", s.gap, className)}
      aria-label="UNIQUE ANALYSE"
      {...rest}
    >
      {!isWordmarkOnly && (
        <UniqueIconFallback className={cn(s.iconBox, "shrink-0", iconColorClass)} />
      )}
      {!isIconOnly && (
        <span
          className={cn(
            "font-bold tracking-tight whitespace-nowrap",
            s.text
          )}
        >
          <span className={uniqueTextClass}>UNIQUE </span>
          <span className={analyseTextClass}>ANALYSE</span>
        </span>
      )}
    </div>
  );
}

export function UniqueIconFallback({
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
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <polygon points="40,4 50,20 60,4 62,32 50,50 38,32" />
        </g>
      ))}
    </svg>
  );
}

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
  size?: "sm" | "md" | "lg" | "xl";
  wordmark?: "full" | "icon" | "wordmark";
}

const SIZE_MAP: Record<NonNullable<UniqueLogoProps["size"]>, {
  height: string;
  iconBox: string;
  text: string;
  gap: string;
}> = {
  sm: { height: "h-6",  iconBox: "size-6",  text: "text-sm",   gap: "gap-2" },
  md: { height: "h-8",  iconBox: "size-8",  text: "text-base", gap: "gap-2.5" },
  lg: { height: "h-10", iconBox: "size-10", text: "text-xl",   gap: "gap-3" },
  xl: { height: "h-14", iconBox: "size-14", text: "text-3xl",  gap: "gap-4" },
};

export function UniqueLogo({
  size = "md",
  wordmark = "full",
  className,
  ...rest
}: UniqueLogoProps) {
  const s = SIZE_MAP[size];
  const [imgFailed, setImgFailed] = React.useState(false);

  const isIconOnly = wordmark === "icon";
  const isWordmarkOnly = wordmark === "wordmark";

  // Image OK — kullan
  if (!imgFailed && !isWordmarkOnly) {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        aria-label="UNIQUE ANALYSE"
        {...rest}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/unique-logo.png"
          alt="UNIQUE ANALYSE"
          onError={() => setImgFailed(true)}
          className={cn(
            isIconOnly ? s.iconBox : s.height,
            "w-auto object-contain select-none"
          )}
          draggable={false}
        />
      </div>
    );
  }

  // Fallback — SVG + yazı (image 404 veya wordmark-only mode)
  return (
    <div
      className={cn("inline-flex items-center", s.gap, className)}
      aria-label="UNIQUE ANALYSE"
      {...rest}
    >
      {!isWordmarkOnly && <UniqueIconFallback className={cn(s.iconBox, "shrink-0")} />}
      {!isIconOnly && (
        <span
          className={cn(
            "font-bold tracking-tight whitespace-nowrap",
            s.text
          )}
        >
          <span className="text-foreground">UNIQUE </span>
          <span className="text-primary">ANALYSE</span>
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

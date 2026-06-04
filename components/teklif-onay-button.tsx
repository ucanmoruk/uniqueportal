"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import TeklifOnayDocument, {
  type OnayTeklif,
  type OnayKarar,
} from "@/app/teklif-print/[id]/TeklifOnayDocument";
import {
  teklifOnaylaAction,
  teklifReddetAction,
} from "@/app/teklif-print/[id]/onay-actions";

interface Props {
  teklifId: number;
  teklif: OnayTeklif;
  /**
   * Site mavisi (primary) renkte buton. `variant="inline"` ile yazdırma
   * önizleme sayfasında kullanılır; @media print ile gizli olur.
   */
  variant?: "header" | "inline";
  className?: string;
}

export function TeklifOnayButton({
  teklifId,
  teklif,
  variant = "header",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [karar, setKarar] = React.useState<OnayKarar | null>(null);
  const router = useRouter();

  React.useEffect(() => setMounted(true), []);

  const handleApprove = async () => {
    const r = await teklifOnaylaAction(teklifId);
    if (!r.ok) throw new Error(r.error);
    setKarar({
      aksiyon: "Onaylandı",
      tarih: r.tarih,
      firmaAd: r.firmaAd,
      yetkili: r.yetkili ?? undefined,
    });
    // Listede/detayda durum güncellensin
    router.refresh();
  };

  const handleReject = async (aciklama: string) => {
    const r = await teklifReddetAction(teklifId, aciklama);
    if (!r.ok) throw new Error(r.error);
    setKarar({
      aksiyon: "Reddedildi",
      tarih: r.tarih,
      firmaAd: r.firmaAd,
      yetkili: r.yetkili ?? undefined,
    });
    router.refresh();
  };

  const isInline = variant === "inline";

  // Inline (PDF önizleme) butonunun stili — kullanıcı tarafından sabitlenen CSS.
  // Bağlantı görünümü (<a>) yerine <button>; styles aynı.
  const inlineStyle: React.CSSProperties = {
    display: "inline-block",
    marginTop: "14px",
    padding: "10px 18px",
    background: "#4A46E5",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
    borderRadius: "6px",
    fontSize: "12px",
    border: 0,
    cursor: "pointer",
  };

  const trigger = isInline ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      // Yazdırma çıktısında gizli ol
      className={cn("no-print", className)}
      style={inlineStyle}
    >
      Onaylıyorum
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        // Detay sayfasında header'da, diğer butonlarla aynı boyut
        "no-print inline-flex items-center gap-2 bg-primary text-primary-foreground h-9 px-4 rounded-md font-medium text-sm shadow-sm hover:brightness-110 transition",
        className
      )}
    >
      <CheckCircle2 className="size-4" />
      Teklifi Onayla
    </button>
  );

  const dialog =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-background shadow-2xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Kapat"
            className="absolute top-3 right-3 z-10 inline-flex items-center justify-center size-9 rounded-full bg-background/90 hover:bg-muted shadow"
          >
            <X className="size-5" />
          </button>
          <TeklifOnayDocument
            teklif={teklif}
            karar={karar}
            onApprove={handleApprove}
            onReject={handleReject}
            sirketEmail="info@uniqueanalyse.com"
          />
        </div>
      </div>
    ) : null;

  return (
    <>
      {trigger}
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}

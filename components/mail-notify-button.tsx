"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  notifyKayitMailAction,
  type MailKayitTuru,
} from "@/app/(portal)/bildirim/mail-action";

interface Props {
  tur: MailKayitTuru;
  id: number;
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function MailNotifyButton({
  tur,
  id,
  label = "Müşteriye Mail Gönder",
  size = "sm",
  variant = "outline",
}: Props) {
  const [confirming, setConfirming] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  async function go() {
    setSending(true);
    setConfirming(false);
    try {
      const res = await notifyKayitMailAction(tur, id);
      if (res.error) toast.error(res.error);
      else toast.success(res.message ?? "Mail gönderildi.");
    } catch (err) {
      toast.error("Mail gönderilemedi: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setConfirming(true)}
        disabled={sending}
      >
        {sending ? (
          <>
            <Loader2 className="animate-spin" /> Gönderiliyor…
          </>
        ) : (
          <>
            <Mail className="size-4" /> {label}
          </>
        )}
      </Button>

      {confirming && (
        <ConfirmModal
          tur={tur}
          onYes={go}
          onNo={() => setConfirming(false)}
        />
      )}
    </>
  );
}

function ConfirmModal({
  tur,
  onYes,
  onNo,
}: {
  tur: MailKayitTuru;
  onYes: () => void;
  onNo: () => void;
}) {
  const kayit = {
    rapor: "rapor",
    teklif: "teklif",
    fatura: "fatura",
    destek: "destek talebi yanıtı",
  }[tur];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border shadow-xl">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-semibold tracking-tight">
            Mail bildirimi gönderilsin mi?
          </h3>
        </div>
        <div className="px-6 py-5 text-sm leading-relaxed">
          <p>
            Bu <strong>{kayit}</strong> için müşteriye e-posta gönderilecek.
          </p>
          <p className="mt-2 text-muted-foreground">
            Firmanın <code>Mail</code> alanı dolu değilse mail gitmez ve hata
            mesajı görürsünüz. SMTP ayarları{" "}
            <strong>Ayarlar &gt; Mail Ayarları</strong> üzerinden yapılır.
          </p>
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onNo}>
            Vazgeç
          </Button>
          <Button type="button" onClick={onYes}>
            <Mail className="size-4" /> Mail Gönder
          </Button>
        </div>
      </div>
    </div>
  );
}

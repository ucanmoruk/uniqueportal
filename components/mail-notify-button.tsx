"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Loader2, Send, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  loadMailDraftAction,
  sendCustomMailAction,
  type MailKayitTuru,
  type MailDraft,
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
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [draft, setDraft] = React.useState<MailDraft | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await loadMailDraftAction(tur, id);
      if (res.error) {
        setError(res.error);
      } else {
        setDraft(res.draft!);
      }
    } catch (err) {
      setError("Hata: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setDraft(null);
    setError(null);
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={openModal}
      >
        <Mail className="size-4" /> {label}
      </Button>

      {open && (
        <ComposeMailModal
          tur={tur}
          loading={loading}
          error={error}
          draft={draft}
          onClose={close}
        />
      )}
    </>
  );
}

// ---- Compose modal --------------------------------------------------------

const KAYIT_ETIKET: Record<MailKayitTuru, string> = {
  rapor: "Rapor",
  teklif: "Teklif",
  fatura: "Fatura",
  destek: "Destek Talebi",
};

function ComposeMailModal({
  tur,
  loading,
  error,
  draft,
  onClose,
}: {
  tur: MailKayitTuru;
  loading: boolean;
  error: string | null;
  draft: MailDraft | null;
  onClose: () => void;
}) {
  const [to, setTo] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    if (draft) {
      setTo(draft.to ?? "");
      setSubject(draft.subject ?? "");
    }
  }, [draft]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSending(true);
    try {
      const res = await sendCustomMailAction({
        to,
        cc,
        subject,
        bodyHtml: draft.bodyHtml,
        note,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message ?? "Mail gönderildi.");
        onClose();
      }
    } catch (err) {
      toast.error("Gönderim hatası: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-card border shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Mail Gönder
            </h3>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {KAYIT_ETIKET[tur]}
              {draft && draft.kayitOzeti && (
                <>
                  {" · "}
                  <span className="font-mono">{draft.kayitOzeti}</span>
                </>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} type="button">
            <X className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="size-4 animate-spin" /> Mail draft hazırlanıyor…
            </div>
          )}

          {error && (
            <div className="border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {draft && (
            <form onSubmit={handleSend} className="space-y-4" id="compose-mail-form">
              <div className="space-y-1.5">
                <Label htmlFor="to" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Kime <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  placeholder="ahmet@firma.com"
                />
                <p className="text-[11px] text-muted-foreground">
                  Birden fazla adres için virgülle ayırın.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cc" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  CC (opsiyonel)
                </Label>
                <Input
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="muhasebe@firma.com, satis@firma.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Konu <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Notunuz (opsiyonel — mailin başına eklenir)
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Merhaba Ahmet Bey, fiyat ayarlaması yaptık…"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary hover:underline"
                >
                  <Eye className="size-3.5" />
                  {previewOpen ? "Önizlemeyi gizle" : "Mail önizlemesi"}
                </button>

                {previewOpen && (
                  <div className="mt-2 border bg-surface-secondary overflow-hidden">
                    <iframe
                      title="Mail önizleme"
                      srcDoc={
                        note
                          ? injectNotePreview(draft.bodyHtml, note)
                          : draft.bodyHtml.replace("<!--UNIQUE_MAIL_NOTE-->", "")
                      }
                      className="w-full h-96 bg-white"
                      sandbox=""
                    />
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose} type="button" disabled={sending}>
            İptal
          </Button>
          <Button
            type="submit"
            form="compose-mail-form"
            disabled={sending || loading || !draft}
          >
            {sending ? (
              <>
                <Loader2 className="animate-spin" /> Gönderiliyor…
              </>
            ) : (
              <>
                <Send className="size-4" /> Mail Gönder
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Önizleme için client-side note enjeksiyonu (server'la aynı patern). */
function injectNotePreview(html: string, note: string): string {
  const safe = note
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  const block = `<div style="margin:0 0 20px;padding:12px 16px;background:#f8f9ff;border-left:3px solid #463aed;font-size:14px;color:#161519;font-style:italic;">${safe}</div>`;
  return html.replace("<!--UNIQUE_MAIL_NOTE-->", block);
}

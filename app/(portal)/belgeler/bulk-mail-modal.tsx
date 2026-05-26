"use client";

import * as React from "react";
import { toast } from "sonner";
import { X, Loader2, Send, Eye, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  loadBulkRaporDraftAction,
  sendCustomMailAction,
  sendBulkRaporMailsAction,
  type BulkRaporGroup,
  type BulkRaporSingle,
} from "@/app/(portal)/bildirim/mail-action";

interface Props {
  raporIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Bulk mail modal — iki davranış:
 * - Seçilen raporlar tek firmaya aitse: compose modal (kime/cc/konu/not/önizleme)
 * - Çoklu firma: gruplandırılmış özet + ortak not + her firmaya ayrı mail
 */
export function BulkMailModal({ raporIds, onClose, onSuccess }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [gruplar, setGruplar] = React.useState<BulkRaporGroup[]>([]);
  const [single, setSingle] = React.useState<BulkRaporSingle | null>(null);

  // Form state
  const [to, setTo] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await loadBulkRaporDraftAction(raporIds);
        if (!active) return;
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setGruplar(res.data.gruplar);
          if (res.data.single) {
            setSingle(res.data.single);
            setTo(res.data.single.to);
            setSubject(res.data.single.subject);
          }
        }
      } catch (err) {
        if (active) setError("Hata: " + (err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [raporIds]);

  const isMulti = gruplar.length > 1;
  const totalRaporlar = gruplar.reduce((n, g) => n + g.raporlar.length, 0);
  const firmasWithoutMail = gruplar.filter((g) => !g.mail).length;

  async function handleSingleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!single) return;
    setSending(true);
    try {
      const res = await sendCustomMailAction({
        to,
        cc,
        subject,
        bodyHtml: single.bodyHtml,
        note,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.message ?? "Mail gönderildi.");
        onSuccess();
      }
    } catch (err) {
      toast.error("Gönderim hatası: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleBulkSend() {
    setSending(true);
    try {
      const res = await sendBulkRaporMailsAction(raporIds, note);
      if (res.errors?.length && !res.sent) {
        toast.error(res.errors[0]);
      } else {
        toast.success(res.message ?? "Mailler gönderildi.");
        onSuccess();
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
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Mail Oluştur
            </h3>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              {totalRaporlar} BELGE · {gruplar.length} FİRMA
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
              <Loader2 className="size-4 animate-spin" /> Draft hazırlanıyor…
            </div>
          )}

          {error && (
            <div className="border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && firmasWithoutMail > 0 && (
            <div className="mb-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 px-3 py-2.5 text-sm flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
              <span>
                <strong>{firmasWithoutMail}</strong> firmanın e-posta adresi
                tanımlı değil; bu firmalara mail atılmayacak.
              </span>
            </div>
          )}

          {/* Tek firma: compose form */}
          {single && !isMulti && (
            <form onSubmit={handleSingleSend} className="space-y-4" id="bulk-mail-form">
              <div className="space-y-1.5">
                <Label htmlFor="to" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Kime <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="to"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cc" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  CC (opsiyonel)
                </Label>
                <Input
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
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
                  Notunuz (opsiyonel)
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Merhaba, raporlarınız ekte / portalda paylaşıldı…"
                />
              </div>

              <BelgelerListPreview gruplar={gruplar} />

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
                      srcDoc={injectNotePreview(single.bodyHtml, note)}
                      className="w-full h-96 bg-white"
                      sandbox=""
                    />
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Çoklu firma: gruplandırılmış özet */}
          {isMulti && !loading && (
            <div className="space-y-4">
              <div className="text-sm">
                Seçimde <strong>{gruplar.length} farklı firma</strong> var. Her
                firma kendi raporlarını içeren ayrı bir digest mail alır.
              </div>

              <BelgelerListPreview gruplar={gruplar} />

              <div className="space-y-1.5">
                <Label htmlFor="bulk-note" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Ortak Not (tüm maillere eklenir, opsiyonel)
                </Label>
                <Textarea
                  id="bulk-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Tüm müşterilere gidecek ortak mesaj…"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2 shrink-0">
          <Button variant="ghost" onClick={onClose} type="button" disabled={sending}>
            İptal
          </Button>
          {!isMulti && single && (
            <Button
              type="submit"
              form="bulk-mail-form"
              disabled={sending || loading}
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
          )}
          {isMulti && (
            <Button
              type="button"
              onClick={handleBulkSend}
              disabled={sending || loading}
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin" /> Gönderiliyor…
                </>
              ) : (
                <>
                  <Mail className="size-4" /> {gruplar.length} Mail Gönder
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BelgelerListPreview({ gruplar }: { gruplar: BulkRaporGroup[] }) {
  return (
    <div className="border bg-surface-secondary">
      <div className="px-3 py-2 border-b text-[10px] uppercase tracking-wider text-muted-foreground">
        Seçili Belgeler
      </div>
      <div className="divide-y max-h-56 overflow-y-auto">
        {gruplar.map((g) => (
          <div key={g.firmaId} className="px-3 py-2.5 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{g.firmaAdi}</span>
              {!g.mail && (
                <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  · Mail yok
                </span>
              )}
              {g.mail && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {g.mail}
                </span>
              )}
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {g.raporlar.slice(0, 5).map((r) => (
                <li key={r.id} className="font-mono">
                  · {r.raporId} — {r.raporAdi}
                </li>
              ))}
              {g.raporlar.length > 5 && (
                <li className="italic">
                  ...ve {g.raporlar.length - 5} tane daha
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function injectNotePreview(html: string, note: string): string {
  if (!note.trim()) return html.replace("<!--UNIQUE_MAIL_NOTE-->", "");
  const safe = note
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  const block = `<div style="margin:0 0 20px;padding:12px 16px;background:#f8f9ff;border-left:3px solid #463aed;font-size:14px;color:#161519;font-style:italic;">${safe}</div>`;
  return html.replace("<!--UNIQUE_MAIL_NOTE-->", block);
}

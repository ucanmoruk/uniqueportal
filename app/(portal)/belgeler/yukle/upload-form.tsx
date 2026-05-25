"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  Upload,
  Trash2,
  FileText,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FirmaCombobox } from "@/components/firma-combobox";
import type { FirmaOption } from "@/lib/repositories/firma";
import {
  uploadBelgelerAction,
  notifyRaporlarAction,
  type UploadItemInput,
  type UploadState,
} from "./actions";

interface UploadRow {
  id: string;
  file: File;
  firmaId: number | null;
  firma: FirmaOption | null;
  talepNo: string;
  tur: string;
  numuneAdi: string;
}

const TUR_OPTIONS = [
  "Rapor",
  "Sertifika",
  "Analiz",
  "Numune Kabul",
  "Sözleşme",
  "Diğer",
];

function formatBytes(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

const initial: UploadState = {};

export function UploadForm({ firmalar }: { firmalar: FirmaOption[] }) {
  const [rows, setRows] = React.useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Bildirim modal state
  const [pendingNotify, setPendingNotify] = React.useState<{
    raporIds: number[];
    firmaCount: number;
    count: number;
  } | null>(null);
  const [notifySending, setNotifySending] = React.useState(false);

  const submitAction = async (
    prev: UploadState,
    _formData: FormData
  ): Promise<UploadState> => {
    const items: UploadItemInput[] = rows.map((r) => ({
      fileName: r.file.name,
      fileSize: r.file.size,
      firmaId: r.firmaId,
      talepNo: r.talepNo ? Number(r.talepNo) : null,
      tur: r.tur,
      numuneAdi: r.numuneAdi,
    }));
    return uploadBelgelerAction(prev, items);
  };

  const [state, formAction, pending] = useActionState(submitAction, initial);

  useEffect(() => {
    if (state.ok && state.raporIds && state.raporIds.length > 0) {
      toast.success(state.message ?? "Kaydedildi.");
      setRows([]);
      // Bildirim modal'ı aç
      setPendingNotify({
        raporIds: state.raporIds,
        firmaCount: state.firmaCount ?? 0,
        count: state.count ?? 0,
      });
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  async function handleNotifyYes() {
    if (!pendingNotify) return;
    setNotifySending(true);
    try {
      const res = await notifyRaporlarAction(pendingNotify.raporIds);
      if (res.error) {
        toast.error(res.error);
      } else {
        const msg =
          res.sent && res.sent > 0
            ? `${res.sent} firmaya mail gönderildi${res.skipped ? ` · ${res.skipped} atlandı` : ""}`
            : `Mail gönderimi yapılamadı (mail adresi tanımlı firma bulunamadı)`;
        if (res.sent && res.sent > 0) toast.success(msg);
        else toast(msg);
      }
    } catch (err) {
      toast.error("Mail gönderilemedi: " + (err as Error).message);
    } finally {
      setNotifySending(false);
      setPendingNotify(null);
    }
  }

  function handleNotifyNo() {
    setPendingNotify(null);
  }

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    setRows((prev) => [
      ...prev,
      ...arr.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        firmaId: null,
        firma: null,
        talepNo: "",
        tur: "Rapor",
        numuneAdi: "",
      })),
    ]);
  }

  function update(id: string, patch: Partial<UploadRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function clearAll() {
    setRows([]);
  }

  const incomplete = rows.filter((r) => !r.firmaId).length;
  const totalSize = rows.reduce((sum, r) => sum + r.file.size, 0);

  return (
    <form action={formAction} className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary-subtle"
            : "border-border bg-surface-secondary hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="size-10 mx-auto text-muted-foreground" />
        <div className="mt-3 text-base font-semibold">
          Dosyaları buraya sürükleyin veya tıklayın
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Birden fazla dosya seçebilirsiniz · PDF, resim, Office dosyaları
        </div>
      </div>

      {/* Rows */}
      {rows.length > 0 && (
        <div className="border bg-card">
          <div className="px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{rows.length} dosya</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {formatBytes(totalSize)}
              </span>
              {incomplete > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="size-3.5" />
                    {incomplete} firma seçilmemiş
                  </span>
                </>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Listeyi Temizle
            </Button>
          </div>

          <ul className="divide-y">
            {rows.map((r, idx) => (
              <li key={r.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="size-10 shrink-0 inline-flex items-center justify-center bg-primary-subtle text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate" title={r.file.name}>
                      {r.file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{idx + 1} · {formatBytes(r.file.size)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(r.id)}
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    title="Sil"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="space-y-1 sm:col-span-5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Firma <span className="text-destructive">*</span>
                    </Label>
                    <FirmaCombobox
                      options={firmalar}
                      value={r.firmaId}
                      onChange={(id, firma) =>
                        update(r.id, { firmaId: id, firma })
                      }
                      turFilter={["Müşteri", "Proje"]}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Talep No
                    </Label>
                    <Input
                      type="number"
                      placeholder="ops."
                      value={r.talepNo}
                      onChange={(e) =>
                        update(r.id, { talepNo: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Tür <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={r.tur}
                      onChange={(e) => update(r.id, { tur: e.target.value })}
                    >
                      {TUR_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Numune Adı
                    </Label>
                    <Input
                      placeholder="ops."
                      value={r.numuneAdi}
                      onChange={(e) =>
                        update(r.id, { numuneAdi: e.target.value })
                      }
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {incomplete === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  Tüm dosyalar hazır
                </span>
              ) : (
                <>
                  Yüklemeden önce <strong>{incomplete}</strong> dosyaya firma
                  seçin.
                </>
              )}
            </div>
            <Button
              type="submit"
              disabled={pending || incomplete > 0 || rows.length === 0}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" /> Yükleniyor…
                </>
              ) : (
                <>
                  <Save /> {rows.length} Dosyayı Kaydet
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* --- Bildirim onay modal --- */}
      {pendingNotify && (
        <NotifyModal
          count={pendingNotify.count}
          firmaCount={pendingNotify.firmaCount}
          sending={notifySending}
          onYes={handleNotifyYes}
          onNo={handleNotifyNo}
        />
      )}
    </form>
  );
}

function NotifyModal({
  count,
  firmaCount,
  sending,
  onYes,
  onNo,
}: {
  count: number;
  firmaCount: number;
  sending: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
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
            <strong>{count}</strong> belge başarıyla kaydedildi
            {firmaCount > 0 && (
              <>
                {" "}
                ({firmaCount} firma).
              </>
            )}
          </p>
          <p className="mt-3 text-muted-foreground">
            İlgili firmalara e-posta yoluyla bildirim göndermek ister misiniz?
            Her firmaya tek bir özet mail iletilir, mail adresi tanımlı olmayan
            firmalar atlanır.
          </p>
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onNo}
            disabled={sending}
          >
            Hayır, atla
          </Button>
          <Button type="button" onClick={onYes} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="animate-spin" /> Gönderiliyor…
              </>
            ) : (
              <>Evet, mail gönder</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

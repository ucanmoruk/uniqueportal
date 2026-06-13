"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  X,
  Info,
} from "lucide-react";
import { yeniTalepAction, type YeniTalepState } from "./actions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Defaults {
  Firma: string;
  Adres: string;
  Yetkili: string;
  Telefon: string;
  Mail: string;
  VergiDairesi: string;
  VergiNo: string;
}

interface NumuneSatir {
  id: string;
  Numune: string;
  Ozellik: string;
  Analiz: string;
  Metot: string;
}

const STEPS = [
  {
    key: "raporlama",
    label: "RAPORLAMA",
    title: "Raporlama Bilgileri",
    desc: "Test raporunuz buradaki bilgilere göre hazırlanacağı için lütfen dikkatle doldurunuz.",
  },
  {
    key: "fatura",
    label: "FATURA",
    title: "Fatura Bilgileri",
    desc: "Faturanın düzenleneceği firma bilgilerini kontrol edin.",
  },
  {
    key: "numuneler",
    label: "NUMUNELER",
    title: "Ürün ve Analiz Bilgileri",
    desc: "Test edilecek numune ve analiz bilgilerini girin.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Dot Background                                                     */
/* ------------------------------------------------------------------ */

function DotBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mouse = React.useRef({ x: -1000, y: -1000 });
  const raf = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GAP = 14;
    const BASE_R = 0.5;
    const MAX_R = 1.6;
    const RANGE = 120;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);

      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (let x = GAP; x < w; x += GAP) {
        for (let y = GAP; y < h; y += GAP) {
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - dist / RANGE);
          const r = BASE_R + (MAX_R - BASE_R) * t * t;
          const alpha = 0.25 + 0.55 * t * t;

          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(59,130,246,${alpha})`;
          ctx!.fill();
        }
      }

      raf.current = requestAnimationFrame(draw);
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Wizard                                                        */
/* ------------------------------------------------------------------ */

const initialState: YeniTalepState = {};

export function YeniTalepForm({ defaults }: { defaults: Defaults }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [state, formAction, pending] = useActionState(yeniTalepAction, initialState);
  const [showSozlesme, setShowSozlesme] = React.useState(false);

  const [numuneler, setNumuneler] = React.useState<NumuneSatir[]>([
    { id: crypto.randomUUID(), Numune: "", Ozellik: "", Analiz: "", Metot: "" },
  ]);

  const current = STEPS[step];
  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;

  function next() {
    if (step < total - 1) setStep(step + 1);
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function addNumune() {
    setNumuneler((prev) => [
      ...prev,
      { id: crypto.randomUUID(), Numune: "", Ozellik: "", Analiz: "", Metot: "" },
    ]);
  }

  function removeNumune(id: string) {
    setNumuneler((prev) =>
      prev.length > 1 ? prev.filter((n) => n.id !== id) : prev
    );
  }

  function updateNumune(id: string, field: keyof NumuneSatir, value: string) {
    setNumuneler((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [field]: value } : n))
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
      <DotBackground />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Step header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              {current.label}
            </span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums tracking-wider">
              {String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
          <div className="h-[3px] w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--uq-color-brand-primary)] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {state.error && (
          <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Form — embedded, no card */}
        <form action={formAction}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {current.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
              {current.desc}
            </p>
          </div>

          {/* Step 1: Raporlama */}
          <div style={{ display: step === 0 ? "block" : "none" }}>
            <div className="grid gap-6 sm:grid-cols-2">
              <EmbedField label="Firma Adı" name="raporlama_Firma" defaultValue={defaults.Firma} required className="sm:col-span-2" />
              <EmbedField label="Adres" name="raporlama_Adres" defaultValue={defaults.Adres} multiline className="sm:col-span-2" />
              <EmbedField label="Yetkili" name="raporlama_Yetkili" defaultValue={defaults.Yetkili} />
              <EmbedField label="İletişim (Tel / E-posta)" name="raporlama_Iletisim" defaultValue={defaults.Telefon} />

              <div className="space-y-2">
                <Label htmlFor="raporlama_Karar" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Karar Kuralı
                </Label>
                <Select id="raporlama_Karar" name="raporlama_Karar" defaultValue="Belirsizlik dahil edilmesin" className="relative z-10 rounded-lg border border-border bg-card px-3 hover:border-foreground/40 focus:ring-1 focus:ring-[var(--uq-color-brand-primary)] focus:border-[var(--uq-color-brand-primary)] transition-all">
                  <option value="Belirsizlik dahil edilmesin">Belirsizlik dahil edilmesin</option>
                  <option value="Belirsizlik pozitif yönde dahil edilsin">Belirsizlik pozitif yönde dahil edilsin</option>
                  <option value="Belirsizlik negatif yönde dahil edilsin">Belirsizlik negatif yönde dahil edilsin</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raporlama_Dil" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rapor Dili
                </Label>
                <Select id="raporlama_Dil" name="raporlama_Dil" defaultValue="Türkçe" className="relative z-10 rounded-lg border border-border bg-card px-3 hover:border-foreground/40 focus:ring-1 focus:ring-[var(--uq-color-brand-primary)] focus:border-[var(--uq-color-brand-primary)] transition-all">
                  <option value="Türkçe">Türkçe</option>
                  <option value="İngilizce">İngilizce</option>
                  <option value="Türkçe ve İngilizce">Hem Türkçe hem İngilizce</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="raporlama_Iade" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Numune İadesi
                </Label>
                <Select id="raporlama_Iade" name="raporlama_Iade" defaultValue="Hayır" className="relative z-10 rounded-lg border border-border bg-card px-3 hover:border-foreground/40 focus:ring-1 focus:ring-[var(--uq-color-brand-primary)] focus:border-[var(--uq-color-brand-primary)] transition-all">
                  <option value="Hayır">Hayır</option>
                  <option value="Evet">Evet</option>
                </Select>
              </div>
              <EmbedField label="Üretici Firma" name="raporlama_UreticiFirma" />
              <EmbedField label="Not" name="raporlama_Note" multiline className="sm:col-span-2" />
            </div>
          </div>

          {/* Step 2: Fatura */}
          <div style={{ display: step === 1 ? "block" : "none" }}>
            <div className="grid gap-6 sm:grid-cols-2">
              <EmbedField label="Firma" name="fatura_Firma" defaultValue={defaults.Firma} className="sm:col-span-2" />
              <EmbedField label="Adres" name="fatura_Adres" defaultValue={defaults.Adres} multiline className="sm:col-span-2" />
              <EmbedField label="Vergi Dairesi" name="fatura_VergiDairesi" defaultValue={defaults.VergiDairesi} />
              <EmbedField label="Vergi No" name="fatura_VergiNo" defaultValue={defaults.VergiNo} />
              <EmbedField label="E-posta" name="fatura_Mail" type="email" defaultValue={defaults.Mail} className="sm:col-span-2" />
            </div>
          </div>

          {/* Step 3: Numuneler */}
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <div className="space-y-6">
              {numuneler.map((n, idx) => (
                <div key={n.id} className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Numune #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNumune(n.id)}
                      disabled={numuneler.length === 1}
                      title="Satırı sil"
                      className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <EmbedField
                      label="Numune"
                      name={`numuneler[${idx}][Numune]`}
                      placeholder="Örn: Krem 100ml"
                      value={n.Numune}
                      onChange={(v) => updateNumune(n.id, "Numune", v)}
                    />
                    <EmbedField
                      label="Seri/Lot No vb."
                      name={`numuneler[${idx}][Ozellik]`}
                      placeholder="Seri / lot / parti no"
                      value={n.Ozellik}
                      onChange={(v) => updateNumune(n.id, "Ozellik", v)}
                    />
                    <EmbedField
                      label="Analiz"
                      name={`numuneler[${idx}][Analiz]`}
                      placeholder="pH, viskozite vs."
                      value={n.Analiz}
                      onChange={(v) => updateNumune(n.id, "Analiz", v)}
                    />
                    <EmbedField
                      label="Metot"
                      name={`numuneler[${idx}][Metot]`}
                      placeholder="TS EN ..."
                      value={n.Metot}
                      onChange={(v) => updateNumune(n.id, "Metot", v)}
                    />
                  </div>
                  {idx < numuneler.length - 1 && (
                    <div className="mt-6 border-b border-border/50" />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addNumune}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 rounded-lg transition-colors"
              >
                <Plus className="size-4" /> Yeni Numune Ekle
              </button>
            </div>

            {/* Metot notu */}
            <div className="mt-6 flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="size-3.5 mt-0.5 shrink-0 text-blue-500" />
              <p>Analiz metodunu belirtmediğiniz durumlarda laboratuvarın uygun metodu seçmesi şartını kabul etmiş sayılırsınız.</p>
            </div>

            {/* Sözleşme onayı */}
            <div className="mt-6 flex items-center gap-3">
              <input
                id="sozlesme"
                name="sozlesme"
                type="checkbox"
                required
                className="size-4 rounded border-input accent-[var(--uq-color-brand-primary)]"
              />
              <label htmlFor="sozlesme" className="text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setShowSozlesme(true)}
                  className="underline underline-offset-2 decoration-muted-foreground/40 hover:text-foreground hover:decoration-foreground transition-colors"
                >
                  UNIQUE hizmet sözleşmesini
                </button>
                {" "}okudum ve kabul ediyorum.
              </label>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <div>
              {step === 0 ? (
                <button
                  type="button"
                  onClick={() => router.push("/talepler")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border bg-card/60 backdrop-blur-sm text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Listeye Dön
                </button>
              ) : (
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border bg-card/60 backdrop-blur-sm text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Geri
                </button>
              )}
            </div>
            <div>
              {step < total - 1 ? (
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--uq-color-brand-primary)] text-white text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Devam Et
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--uq-color-brand-primary)] text-white text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Talebi Oluştur
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center justify-center size-8 rounded-full text-xs font-bold transition-all ${
                  i < step
                    ? "bg-[var(--uq-color-brand-primary)] text-white"
                    : i === step
                      ? "bg-[var(--uq-color-brand-primary)] text-white ring-4 ring-[var(--uq-color-brand-primary)]/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Sözleşme popup */}
      {showSozlesme && <SozlesmeModal onClose={() => setShowSozlesme(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sözleşme Modal                                                     */
/* ------------------------------------------------------------------ */

function SozlesmeModal({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Kapat"
      />
      <div className="relative w-full max-w-2xl max-h-[80vh] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-bold text-foreground">UNIQUE Hizmet Sözleşmesi</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground space-y-4">
          <p className="font-semibold text-foreground">1. Genel Hükümler</p>
          <p>Bu sözleşme, UNIQUE Services Laboratuvarı (bundan sonra &quot;Laboratuvar&quot; olarak anılacaktır) ile müşteri arasındaki hizmet ilişkisini düzenler. Müşteri, analiz talebi oluşturarak bu sözleşme şartlarını kabul etmiş sayılır.</p>

          <p className="font-semibold text-foreground">2. Numune Kabul ve Saklama</p>
          <p>Numuneler, laboratuvara ulaştığı andan itibaren laboratuvarın sorumluluğundadır. Numune iadesi talep edilmediği sürece, analiz tamamlandıktan sonra numuneler laboratuvar prosedürlerine uygun şekilde imha edilir. İade talep edilen numuneler, analiz sonrasında 30 gün içerisinde teslim alınmalıdır.</p>

          <p className="font-semibold text-foreground">3. Analiz ve Raporlama</p>
          <p>Laboratuvar, analizleri uluslararası standartlara ve akredite metotlara uygun olarak gerçekleştirir. Analiz metodunun belirtilmediği durumlarda, laboratuvar uygun metodu seçme hakkına sahiptir. Raporlar, talep edilen dilde ve formatta hazırlanır.</p>

          <p className="font-semibold text-foreground">4. Ödeme Koşulları</p>
          <p>Yapılacak analizlere ve hizmetlere ait ücretler, müşteri tarafından peşin olarak ödenir. Rapor, ödeme yapıldıktan sonra müşteriye gönderilir. Ödemenin yapılmaması halinde, Laboratuvar ödeme yapılıncaya kadar analiz hizmetlerine başlamama veya analiz raporunu müşteriye iletmeme hakkına sahiptir.</p>

          <p className="font-semibold text-foreground">5. Gizlilik</p>
          <p>Laboratuvar, müşteriye ait tüm bilgileri ve analiz sonuçlarını gizli tutar. Yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.</p>

          <p className="font-semibold text-foreground">6. Sorumluluk Sınırı</p>
          <p>Laboratuvarın sorumluluğu, analiz ücretinin toplam tutarı ile sınırlıdır. Analiz sonuçlarının kullanımından doğacak dolaylı zararlardan laboratuvar sorumlu tutulamaz.</p>

          <p className="font-semibold text-foreground">7. Uyuşmazlık</p>
          <p>Bu sözleşmeden doğan uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
        </div>
        <div className="px-6 py-4 border-t shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[var(--uq-color-brand-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Embedded Field — borderless, page-embedded style                   */
/* ------------------------------------------------------------------ */

function EmbedField({
  label,
  name,
  defaultValue,
  value,
  onChange,
  required,
  multiline,
  type,
  className,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  const controlled = value !== undefined;
  const inputCls = "relative z-10 rounded-lg border border-border bg-card px-3 hover:border-foreground/40 focus-visible:ring-1 focus-visible:ring-[var(--uq-color-brand-primary)] focus-visible:border-[var(--uq-color-brand-primary)] transition-all placeholder:text-muted-foreground/40";

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <Label htmlFor={name} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={name}
          name={name}
          defaultValue={controlled ? undefined : (defaultValue ?? "")}
          value={controlled ? value : undefined}
          onChange={controlled ? (e) => onChange?.(e.target.value) : undefined}
          required={required}
          placeholder={placeholder}
          className={inputCls}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type ?? "text"}
          defaultValue={controlled ? undefined : (defaultValue ?? "")}
          value={controlled ? value : undefined}
          onChange={controlled ? (e) => onChange?.(e.target.value) : undefined}
          required={required}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </div>
  );
}

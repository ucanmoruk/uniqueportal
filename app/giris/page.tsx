import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { UniqueLogo } from "@/components/unique-logo";

export const metadata = {
  title: "Giriş — UNIQUE Services Portal",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_minmax(440px,520px)]">
      {/* Sol panel — koyu zemin, marka mesajı */}
      <div className="uq-hero-dark relative hidden lg:flex items-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 px-16 max-w-2xl">
          {/* Eyebrow */}
          <div className="mb-6 text-[10px] font-semibold tracking-[0.18em] uppercase text-[color:var(--uq-color-signal-blue-100)]">
            ▸ Müşteri Portalı
          </div>

          {/* Hero başlık */}
          <h1 className="text-[clamp(2rem,1.5rem+2vw,3.25rem)] font-bold uppercase leading-[1.05] tracking-tight mb-7 text-[color:var(--uq-color-neutral-0)]">
            Formülden
            <br />
            bildirime,
            <br />
            <span className="text-[color:var(--uq-color-signal-blue-100)]">
              tek çözüm.
            </span>
          </h1>

          {/* Alt açıklama */}
          <p className="text-base leading-relaxed max-w-md mb-10 text-[color:var(--uq-color-graphite-plum-600)]">
            Kozmetik test ve analiz süreçlerinizi UNIQUE müşteri portalı ile
            tek bir ekrandan yönetin. Talepleriniz, raporlarınız, teklifleriniz
            ve cari hesabınız anlık erişiminizde.
          </p>

          {/* Alt etiket */}
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[color:var(--uq-color-graphite-plum-600)]">
            <span className="size-1.5 bg-[color:var(--uq-color-signal-blue-100)]" />
            <span>Powered by UNIQUE Test &amp; Compliance Protocol</span>
          </div>
        </div>
      </div>

      {/* Sağ panel — açık zemin, logo + login formu */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Marka — orijinal JPEG, beyaz zemin üzerinde doğal görünür */}
          <div className="mb-12">
            <UniqueLogo size="lg" />
          </div>

          <div className="mb-10">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold mb-3">
              ▸ Giriş
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight leading-tight">
              Portala
              <br />
              giriş yapın
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              Devam etmek için kayıtlı e-posta adresiniz ve parolanız ile
              oturum açın.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <div className="pt-10 mt-10 border-t space-y-2 text-center">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              E-posta adresiniz kayıtlı değil mi?
            </p>
            <a
              href="https://wa.me/905408861627"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              +90 540 886 16 27
            </a>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp üzerinden destek alabilirsiniz
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

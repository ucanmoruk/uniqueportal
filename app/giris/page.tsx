import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { UniqueLogo } from "@/components/unique-logo";

export const metadata = {
  title: "Giriş — UNIQUE Services Portal",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_minmax(440px,520px)] bg-background">
      {/* Sol panel — UNIQUE marka mesajı (Webflow tarzı) */}
      <div className="relative hidden lg:flex items-center bg-sidebar text-sidebar-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 px-16 max-w-2xl">
          {/* Marka */}
          <div className="mb-14">
            <UniqueLogo size="lg" />
            <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">
              Services Portal
            </div>
          </div>

          {/* Eyebrow */}
          <div className="mb-6 text-[10px] font-semibold tracking-[0.18em] uppercase text-sidebar-primary">
            ▸ Müşteri Portalı
          </div>

          {/* Hero başlık */}
          <h1 className="text-[clamp(2rem,1.5rem+2vw,3.25rem)] font-bold uppercase leading-[1.05] tracking-tight mb-7">
            Formülden
            <br />
            bildirime,
            <br />
            <span className="text-sidebar-primary">tek çözüm.</span>
          </h1>

          {/* Alt açıklama */}
          <p className="text-sidebar-muted text-base leading-relaxed max-w-md mb-10">
            Kozmetik test ve analiz süreçlerinizi UNIQUE müşteri portalı ile
            tek bir ekrandan yönetin. Talepleriniz, raporlarınız, teklifleriniz
            ve cari hesabınız anlık erişiminizde.
          </p>

          {/* Alt etiket */}
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-sidebar-muted">
            <span className="size-1.5 bg-sidebar-primary" />
            <span>Powered by UNIQUE Test &amp; Compliance Protocol</span>
          </div>
        </div>
      </div>

      {/* Sağ panel — login formu */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <UniqueLogo size="md" />
            <div className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Services Portal
            </div>
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
              Devam etmek için firma kodunuz ve parolanız ile oturum açın.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground text-center pt-10 mt-10 border-t">
            Bir sorun mu var?{" "}
            <span className="text-foreground font-semibold">
              Müşteri temsilciniz
            </span>{" "}
            ile iletişime geçin
          </p>
        </div>
      </div>
    </div>
  );
}

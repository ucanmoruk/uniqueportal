import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { FlaskConical, ShieldCheck, FileCheck2, Headphones } from "lucide-react";

export const metadata = {
  title: "Giriş — UNIQUE Services Portal",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1fr_minmax(420px,520px)] bg-background">
      {/* Sol panel — marka + değer önerisi */}
      <div className="relative hidden lg:flex items-center justify-center bg-sidebar text-sidebar-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 max-w-md px-12">
          <div className="mb-10 inline-flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <FlaskConical className="size-6" />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-semibold">UNIQUE</div>
              <div className="text-xs text-sidebar-muted tracking-wide">
                Services Portal
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold leading-snug mb-4 tracking-tight">
            Test, analiz ve raporlama süreçlerinizi tek bir ekrandan yönetin.
          </h1>
          <p className="text-sidebar-muted text-base leading-relaxed">
            UNIQUE Analiz Belgelendirme ve Gözetim Hizmetleri olarak müşterilerimize
            sunduğumuz kozmetik test hizmetleri için modern müşteri portalına hoş
            geldiniz.
          </p>

          <div className="mt-10 space-y-4">
            <Feature
              icon={FileCheck2}
              title="Test raporu erişimi"
              desc="Tamamlanan analizlere ait raporlarınızı online görüntüleyin."
            />
            <Feature
              icon={ShieldCheck}
              title="Güvenli teklif onayı"
              desc="Aldığınız teklifleri inceleyip dijital olarak onaylayın."
            />
            <Feature
              icon={Headphones}
              title="Anlık destek"
              desc="Süreciniz boyunca uzman ekibimize doğrudan ulaşın."
            />
          </div>
        </div>
      </div>

      {/* Sağ panel — login formu */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <div className="inline-flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
                <FlaskConical className="size-5" />
              </span>
              <div className="leading-tight">
                <div className="font-semibold">UNIQUE</div>
                <div className="text-[11px] text-muted-foreground">
                  Services Portal
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Portala giriş yapın
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Devam etmek için firma kodunuz ve parolanız ile oturum açın.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="text-xs text-muted-foreground text-center pt-6 border-t">
            Hesabınızla ilgili bir sorun mu var?{" "}
            <span className="text-foreground font-medium">
              Müşteri temsilcinizle iletişime geçin.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="inline-flex shrink-0 items-center justify-center size-9 rounded-md bg-sidebar-accent text-sidebar-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-sidebar-muted leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

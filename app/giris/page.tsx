import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { FlaskConical } from "lucide-react";

export const metadata = {
  title: "Giriş — UNIQUE Services Portal",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-primary/90 via-primary to-primary/60 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur">
            <FlaskConical className="size-8" />
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            UNIQUE Kozmetik Hizmet Portalı
          </h1>
          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Test raporlarınız, teklifleriniz ve cari hesabınız tek bir
            ekranda. Modern, hızlı, mobil uyumlu.
          </p>
          <div className="mt-12 space-y-3 text-sm text-primary-foreground/80">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Anlık test raporu erişimi
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Online teklif onayı
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Cari hesap ve fatura takibi
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-3">
              <FlaskConical className="size-7" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight">Hoş geldiniz</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Devam etmek için lütfen kullanıcı kodunuz ve parolanızla giriş yapın.
            </p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>

          <p className="text-xs text-muted-foreground text-center pt-4 border-t">
            Sorun mu yaşıyorsunuz? Plasiyerinizle iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
}

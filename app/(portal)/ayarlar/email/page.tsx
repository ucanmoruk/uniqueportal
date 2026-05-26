import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEmailAyar } from "@/lib/repositories/email-ayar";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { EmailAyarForm } from "./email-ayar-form";

export const dynamic = "force-dynamic";

export default async function EmailAyarPage() {
  const user = await requireUser();
  if (user.tur !== "Admin") {
    redirect("/ozet");
  }

  const ayar = await getEmailAyar().catch(() => null);

  return (
    <>
      <PageHeader
        title="Mail Ayarları"
        description="Portalın e-posta gönderimi için kullanacağı SMTP sunucusu yapılandırması."
      />

      <Card className="mb-6">
        <CardContent className="flex items-start gap-3 p-4 bg-primary-subtle/30 border border-primary/20">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm space-y-1.5">
            <div className="font-semibold">Hızlı kurulum ipuçları</div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[13px]">
              <li>Gmail için: Host <code>smtp.gmail.com</code>, Port <code>587</code>, App Password kullanın</li>
              <li>Office 365: Host <code>smtp.office365.com</code>, Port <code>587</code>, STARTTLS</li>
              <li>Yandex: Host <code>smtp.yandex.com.tr</code>, Port <code>465</code>, SSL/TLS</li>
              <li>Kendi hosting paneliniz (cPanel, Plesk vb.): Mail Accounts &gt; Connect Devices'tan bilgileri alın</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Yapılandırması</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailAyarForm
            initial={{
              Host: ayar?.Host ?? "",
              Port: ayar?.Port ?? 587,
              Secure: ayar?.Secure ?? false,
              Username: ayar?.Username ?? "",
              HasSifre: !!ayar?.Sifre,
              FromEmail: ayar?.FromEmail ?? "",
              FromName: ayar?.FromName ?? "UNIQUE ANALYSE",
              Aktif: ayar?.Aktif ?? true,
            }}
            defaultTestEmail={user.firmaAdi ? "" : ""}
          />
        </CardContent>
      </Card>
    </>
  );
}

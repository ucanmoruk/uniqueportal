import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listFirmaOptions } from "@/lib/repositories/firma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Info } from "lucide-react";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function BelgeYuklePage() {
  const user = await requireUser();
  if (user.tur !== "Admin") {
    redirect("/belgeler");
  }

  const firmalar = await listFirmaOptions();

  return (
    <>
      <PageHeader
        title="Belge Yükle"
        description={`${firmalar.length} aktif firma arasından seçim yapabilirsiniz. Sürükle-bırak ile toplu yükleme.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/belgeler">
              <ArrowLeft className="size-4" /> Belgelere dön
            </Link>
          </Button>
        }
      />

      <Card className="mb-6 bg-primary-subtle/30 border-primary/30">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm space-y-1.5">
            <div className="font-semibold">Çalışma akışı</div>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Dosyaları sürükle-bırak ile veya tıklayarak seçin.</li>
              <li>
                Her dosya için <strong>Firma</strong> (zorunlu) ve isterseniz{" "}
                <strong>Talep No</strong>, <strong>Numune Adı</strong> ekleyin.
              </li>
              <li>
                Tip varsayılan <strong>Rapor</strong>; istenirse Sertifika /
                Analiz / Diğer olarak değiştirin.
              </li>
              <li>
                Tümünü Kaydet — dosyalar storage&apos;a yüklenir ve Rapor
                kayıtları oluşturulur (depolama entegrasyonu yakında).
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <UploadForm firmalar={firmalar} />
    </>
  );
}

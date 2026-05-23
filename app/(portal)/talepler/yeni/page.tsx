import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { findFirmaById } from "@/lib/repositories/firma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { YeniTalepForm } from "./talep-form";

export const dynamic = "force-dynamic";

export default async function YeniTalepPage() {
  const user = await requireUser();
  const firma = await findFirmaById(user.id);

  return (
    <>
      <PageHeader
        title="Yeni Talep Oluştur"
        description="Numuneleriniz için analiz talebi açın."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/talepler">
              <ArrowLeft className="size-4" /> Listeye dön
            </Link>
          </Button>
        }
      />

      <YeniTalepForm
        defaults={{
          Firma: firma?.Firma_Adi ?? user.firmaAdi,
          Adres: firma?.Adres ?? "",
          Yetkili: firma?.Yetkili ?? "",
          Telefon: firma?.Telefon ?? "",
          Mail: firma?.Mail ?? "",
          VergiDairesi: firma?.Vergi_Dairesi ?? "",
          VergiNo: firma?.Vergi_No ?? "",
        }}
      />
    </>
  );
}

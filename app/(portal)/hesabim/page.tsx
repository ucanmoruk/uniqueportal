import { requireUser } from "@/lib/auth";
import { findFirmaById } from "@/lib/repositories/firma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { ProfilForm } from "./profil-form";
import { ParolaForm } from "./parola-form";

export const dynamic = "force-dynamic";

export default async function HesabimPage() {
  const user = await requireUser();
  const firma = await findFirmaById(user.id);
  if (!firma) notFound();

  return (
    <>
      <PageHeader
        title="Hesabım"
        description="Firma bilgilerinizi ve parolanızı buradan yönetin."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="primary">{firma.Tur ?? "—"}</Badge>
            <span className="text-xs text-muted-foreground font-mono">{firma.Kod}</span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        <Card>
          <CardHeader>
            <CardTitle>Profil Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilForm
              defaults={{
                Firma_Adi: firma.Firma_Adi ?? "",
                Adres: firma.Adres ?? "",
                Vergi_Dairesi: firma.Vergi_Dairesi ?? "",
                Vergi_No: firma.Vergi_No ?? "",
                Telefon: firma.Telefon ?? "",
                Mail: firma.Mail ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parola Değiştir</CardTitle>
          </CardHeader>
          <CardContent>
            <ParolaForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

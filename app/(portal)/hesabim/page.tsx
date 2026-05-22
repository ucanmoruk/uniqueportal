import { requireUser } from "@/lib/auth";
import { findFirmaById } from "@/lib/repositories/firma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HesabimPage() {
  const user = await requireUser();
  const firma = await findFirmaById(user.id);
  if (!firma) notFound();

  return (
    <>
      <PageHeader
        title="Hesabım"
        description="Firma bilgileriniz aşağıdadır. Düzenleme yakında eklenecektir."
        actions={<Badge tone="primary">{firma.Tur ?? "—"}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Firma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Firma Adı" value={firma.Firma_Adi} />
            <Field label="Kullanıcı Kodu" value={firma.Kod} mono />
            <Field label="Yetkili" value={firma.Yetkili} />
            <Field label="Sektör" value={firma.Sektor} />
            <Field label="Hizmet" value={firma.Hizmet} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İletişim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Adres" value={firma.Adres} multiline />
            <Field label="Telefon" value={firma.Telefon} />
            <Field label="E-posta" value={firma.Mail} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fatura Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Vergi Dairesi" value={firma.Vergi_Dairesi} />
            <Field label="Vergi No" value={firma.Vergi_No} mono />
            <Field label="Vade" value={firma.Vade} />
            <Field label="Ödeme" value={firma.Odeme} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plasiyer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Plasiyer" value={firma.Plasiyer} />
            <Field
              label="Plasiyer ID"
              value={firma.PlasiyerID == null ? null : String(firma.PlasiyerID)}
              mono
            />
            <Field label="Durum" value={firma.Durum} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  multiline,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={[
          "mt-0.5",
          multiline ? "whitespace-pre-wrap" : "truncate",
          mono ? "font-mono text-xs" : "",
        ].join(" ")}
      >
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

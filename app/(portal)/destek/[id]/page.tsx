import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDestekDetail } from "@/lib/repositories/destek";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { MesajForm } from "./mesaj-form";

export const dynamic = "force-dynamic";

function tryParseDate(value: string | Date | null): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimestamp(value: string | Date | null) {
  const d = tryParseDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function DestekDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const user = await requireUser();
  const { header, mesajlar } = await getDestekDetail(user, numId);
  if (!header) notFound();

  return (
    <>
      <PageHeader
        title={header.BASLIK ?? "Destek Talebi"}
        description={`Talep ${header.DESTEK_NO ?? `#${header.TalepID}`}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/destek">
                <ArrowLeft className="size-4" /> Listeye dön
              </Link>
            </Button>
            <StatusBadge value={header.Durum} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardHeader>
            <CardTitle>Konuşma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mesajlar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Henüz mesaj yok.
              </p>
            ) : (
              mesajlar.map((m) => {
                const isAdmin = (m.GonderenTur ?? "").toLowerCase() === "admin";
                return (
                  <div
                    key={m.DETAY_ID}
                    className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 shadow-sm ${
                        isAdmin
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1 flex items-center gap-2">
                        <span className="font-medium">
                          {m.GonderenFirma ?? "Sistem"}
                        </span>
                        <span>·</span>
                        <span>{formatTimestamp(m.MESAJ_TARIHI)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.MESAJ ?? ""}</p>
                    </div>
                  </div>
                );
              })
            )}

            <div className="pt-4 border-t">
              <MesajForm talepId={numId} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Talep Bilgisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="Talep No" value={header.DESTEK_NO} />
            <Field label="Tarih" value={formatTimestamp(header.Tarih)} />
            <Field label="Açan Firma" value={header.KayitEdenFirma} />
            <Field label="Durum" value={header.Durum} />
            {header.ACIKLAMA && (
              <Field label="İlk Açıklama" value={header.ACIKLAMA} multiline />
            )}
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
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={multiline ? "mt-0.5 whitespace-pre-wrap" : "mt-0.5"}>
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

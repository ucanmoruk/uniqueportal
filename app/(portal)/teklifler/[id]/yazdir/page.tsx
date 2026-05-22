import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  findTeklifByListId,
  getTeklifDetail,
} from "@/lib/repositories/teklif";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function YazdirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  await requireUser();
  const ref = await findTeklifByListId(numId);
  if (!ref) notFound();
  const { baslik, satirlar } = await getTeklifDetail(ref.TeklifNo);
  if (!baslik) notFound();

  const currency = baslik.ParaBirimi || "₺";

  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <title>Teklif #{baslik.TeklifNo} - Yazdır</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; background:#fff; font-size:13px; }
              .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:14px; margin-bottom:18px; }
              .company { font-weight:700; font-size:14px; line-height:1.4; }
              .meta { text-align:right; font-size:12px; }
              h1 { font-size:18px; margin:0 0 6px; }
              .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:18px; }
              .grid .label { font-size:10px; text-transform:uppercase; color:#666; }
              .grid .val { font-weight:500; margin-top:2px; }
              table { width:100%; border-collapse:collapse; }
              th, td { padding:8px 10px; text-align:left; border-bottom:1px solid #ddd; font-size:12px; }
              th { background:#f5f5f5; font-size:11px; text-transform:uppercase; }
              td.r, th.r { text-align:right; font-variant-numeric:tabular-nums; }
              .footer { margin-top:24px; font-size:11px; color:#666; }
              @media print { body { padding:14mm; } .noprint{display:none;} }
            `,
          }}
        />
      </head>
      <body>
        <div className="header">
          <div>
            <div className="company">
              UNIQUE ANALİZ BELGELENDİRME VE GÖZETİM HİZMETLERİ LTD. ŞTİ.
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              Kozmetik Hizmet Portalı
            </div>
          </div>
          <div className="meta">
            <h1>Teklif #{baslik.TeklifNo}</h1>
            <div>Tarih: {formatDate(baslik.Tarih)}</div>
            <div>Tür: {baslik.TeklifTuru ?? "—"}</div>
            <div>Durum: {baslik.TeklifDurum ?? "—"}</div>
          </div>
        </div>

        <div className="grid">
          <div>
            <div className="label">Müşteri</div>
            <div className="val">{baslik.Firma_Adi ?? "—"}</div>
            {baslik.FirmaAdres && (
              <div style={{ fontSize: 11, marginTop: 4 }}>{baslik.FirmaAdres}</div>
            )}
          </div>
          <div>
            <div className="label">İletişim</div>
            <div>{baslik.Telefon ?? "—"}</div>
            <div>{baslik.Mail ?? "—"}</div>
          </div>
        </div>

        {baslik.Aciklama && (
          <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ fontSize: 10, color: "#666", textTransform: "uppercase" }}>
              Açıklama
            </div>
            <div style={{ marginTop: 2, whiteSpace: "pre-wrap" }}>
              {baslik.Aciklama}
            </div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Akr.</th>
              <th>Hizmet</th>
              <th>Metot</th>
              <th className="r">Birim Fiyat</th>
              <th className="r">Adet</th>
              <th className="r">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s, idx) => (
              <tr key={s.ID}>
                <td>{idx + 1}</td>
                <td>{s.Akreditasyon === "Var" ? "✓" : ""}</td>
                <td>{s.Hizmet ?? "—"}</td>
                <td>{s.Metot ?? "—"}</td>
                <td className="r">
                  {s["Birim Fiyat"]} {currency}
                </td>
                <td className="r">{s.Adet ?? "—"}</td>
                <td className="r">
                  {s.Toplam} {currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="footer">
          Bu teklif {formatDate(baslik.Tarih)} tarihinde oluşturulmuştur. Para birimi: {currency}.
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: "setTimeout(() => window.print(), 300);",
          }}
        />
      </body>
    </html>
  );
}

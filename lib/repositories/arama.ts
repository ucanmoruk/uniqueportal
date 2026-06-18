import { query } from "@/lib/db-mysql";
import { isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export type AramaTuru = "talep" | "teklif" | "rapor" | "fatura";

export interface AramaSonuc {
  type: AramaTuru;
  id: number;
  baslik: string;
  altBaslik: string | null;
  durum: string | null;
  link: string;
}

export async function aramaYap(
  user: SessionUser,
  terim: string,
  perSource = 6
): Promise<AramaSonuc[]> {
  const q = terim.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const sonuclar: AramaSonuc[] = [];

  // ---- Talepler ----
  try {
    const talepFilter = isAdmin(user)
      ? ""
      : "AND FirmaKodu = @kod";
    const talepler = await query<{
      ID: number;
      "Talep No": string;
      "Müşteri": string | null;
      Durum: string | null;
    }>(
      `SELECT ID, \`Talep No\`, \`Müşteri\`, Durum
       FROM VIEW_TALEP_LISTE
       WHERE (\`Talep No\` LIKE @like OR \`Müşteri\` LIKE @like) ${talepFilter}
       ORDER BY Tarih DESC, ID DESC
       LIMIT ${perSource}`,
      isAdmin(user) ? { like } : { like, kod: user.kod }
    );
    for (const t of talepler) {
      sonuclar.push({
        type: "talep",
        id: t.ID,
        baslik: t["Talep No"],
        altBaslik: t["Müşteri"],
        durum: t.Durum,
        link: `/talepler/${t.ID}`,
      });
    }
  } catch {
    /* kaynak hatası diğerlerini engellemesin */
  }

  // ---- Teklifler ----
  try {
    const teklifFilter = isAdmin(user) ? "" : "AND tb.MusteriID = @id";
    const teklifler = await query<{
      ID: number;
      TeklifNoText: string;
      MusteriAd: string | null;
      TeklifDurum: string | null;
    }>(
      `SELECT
         tb.ID,
         CONCAT(
           COALESCE(tb.DisTeklifKodu, CONCAT('UQ', tb.TeklifNo)),
           '/',
           LPAD(tb.RevNo, 2, '0')
         ) AS TeklifNoText,
         m.Firma_Adi AS MusteriAd,
         tb.TeklifDurum
       FROM TeklifBaslik tb
       LEFT JOIN Firma m ON m.ID = tb.MusteriID
       WHERE tb.Durum = 'Aktif'
         AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
         AND (
           tb.DisTeklifKodu LIKE @like
           OR CAST(tb.TeklifNo AS CHAR) LIKE @like
           OR m.Firma_Adi LIKE @like
           OR tb.TeklifKonusu LIKE @like
         )
         ${teklifFilter}
       ORDER BY tb.Tarih DESC, tb.ID DESC
       LIMIT ${perSource}`,
      isAdmin(user) ? { like } : { like, id: user.id }
    );
    for (const t of teklifler) {
      sonuclar.push({
        type: "teklif",
        id: t.ID,
        baslik: t.TeklifNoText,
        altBaslik: t.MusteriAd,
        durum: t.TeklifDurum,
        link: `/teklifler/${t.ID}`,
      });
    }
  } catch {
    /* yoksay */
  }

  // ---- NKR Raporları ----
  try {
    const nkrFilter = isAdmin(user)
      ? ""
      : "AND n.Firma_ID = @firmaId";
    const nkrParams: Record<string, string | number> = { like };
    if (!isAdmin(user)) nkrParams.firmaId = user.id;

    const nkrRaporlar = await query<{
      OnayID: number;
      RaporNo: number | null;
      NumuneAd: string | null;
      MusteriAd: string | null;
    }>(
      `SELECT
         -o.ID AS OnayID,
         n.RaporNo,
         n.Numune_Adi AS NumuneAd,
         f.Firma_Adi AS MusteriAd
       FROM NKR_RaporOnay o
       INNER JOIN NKR n ON n.ID = o.NkrID
       LEFT JOIN Firma f ON f.ID = n.Firma_ID
       WHERE o.YayinUrl IS NOT NULL
         AND TRIM(o.YayinUrl) <> ''
         AND n.Durum = 'Aktif'
         AND (n.Numune_Adi LIKE @like OR f.Firma_Adi LIKE @like OR CAST(n.RaporNo AS CHAR) LIKE @like)
         ${nkrFilter}
       ORDER BY o.YayinTarihi DESC, o.ID DESC
       LIMIT ${perSource}`,
      nkrParams
    );
    for (const r of nkrRaporlar) {
      sonuclar.push({
        type: "rapor",
        id: r.OnayID,
        baslik: r.RaporNo ? `UQ${r.RaporNo}` : `Rapor`,
        altBaslik: r.NumuneAd ?? r.MusteriAd,
        durum: null,
        link: `/belgeler`,
      });
    }
  } catch {
    /* yoksay */
  }

  // ---- Faturalar ----
  try {
    const faturaFilter = isAdmin(user)
      ? ""
      : "AND (`Müşteri` = @firma OR Proje = @firma)";
    const faturalar = await query<{
      ID: number;
      "Fatura No": string;
      "Müşteri": string | null;
      Durum: string | null;
    }>(
      `SELECT ID, \`Fatura No\`, \`Müşteri\`, Durum
       FROM VIEW_FATURA
       WHERE (\`Fatura No\` LIKE @like OR \`Müşteri\` LIKE @like)
         ${faturaFilter}
       ORDER BY Tarih DESC, ID DESC
       LIMIT ${perSource}`,
      isAdmin(user) ? { like } : { like, firma: user.firmaAdi ?? "" }
    );
    for (const f of faturalar) {
      sonuclar.push({
        type: "fatura",
        id: f.ID,
        baslik: f["Fatura No"],
        altBaslik: f["Müşteri"],
        durum: f.Durum,
        link: `/faturalar`,
      });
    }
  } catch {
    /* yoksay */
  }

  return sonuclar;
}

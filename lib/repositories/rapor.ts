import { query, queryOne } from "@/lib/db";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface RaporListItem {
  ID: number;
  Tarih: Date | null;
  "Dosya No": number;
  TalepNo: number | null;
  "Müşteri": string | null;
  Proje: string | null;
  "Dosya Türü": string | null;
  "Dosya Adı": string | null;
  RaporID: string | null;
  /**
   * Görüntüle linki. Eğer http(s):// ile başlıyorsa dış URL olarak yeni sekmede
   * açılır (NKR_RaporOnay.YayinUrl). Aksi takdirde `/api/belge/[ID]` kullanılır
   * (manuel yüklenen PDF).
   */
  Yol: string | null;
}

/**
 * Manuel yüklenen raporlar (VIEW_RAPOR) + yayınlanmış NKR raporları
 * (NKR_RaporOnay.YayinUrl) birleştirilmiş tek liste.
 */
export async function listRaporlar(
  user: SessionUser
): Promise<RaporListItem[]> {
  const [manuel, yayinlanmis] = await Promise.all([
    listManuelRaporlar(user),
    listYayinlanmisNkrRaporlari(user),
  ]);

  const merged = [...yayinlanmis, ...manuel];
  // Tarihe göre azalan, NULL'lar en sonda
  merged.sort((a, b) => {
    const ta = a.Tarih ? new Date(a.Tarih).getTime() : 0;
    const tb = b.Tarih ? new Date(b.Tarih).getTime() : 0;
    return tb - ta;
  });
  return merged;
}

async function listManuelRaporlar(
  user: SessionUser
): Promise<RaporListItem[]> {
  if (isAdmin(user)) {
    return query<RaporListItem>(
      `SELECT ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
              [Dosya Türü], [Dosya Adı], RaporID, Yol
       FROM VIEW_RAPOR WHERE Durum = 'Aktif'
       ORDER BY Tarih DESC, ID DESC`
    );
  }
  if (user.tur === "Plasiyer") {
    return query<RaporListItem>(
      `SELECT ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
              [Dosya Türü], [Dosya Adı], RaporID, Yol
       FROM VIEW_RAPOR
       WHERE Durum = 'Aktif' AND PlasiyerID = @pid
       ORDER BY Tarih DESC, ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  }
  const scope = scopeByFirma(user, "musteri-proje");
  return query<RaporListItem>(
    `SELECT ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
            [Dosya Türü], [Dosya Adı], RaporID, Yol
     FROM VIEW_RAPOR
     WHERE Durum = 'Aktif' AND ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

interface NkrRaw {
  OnayID: number;
  NkrID: number;
  Tarih: Date | null;
  RaporNo: number | null;
  TalepNo: number | null;
  MusteriAd: string | null;
  RaporFormati: string | null;
  NumuneAd: string | null;
  YayinUrl: string | null;
}

/**
 * NKR_RaporOnay tablosundan yayınlanmış raporları çeker. Sadece YayinUrl dolu
 * olanlar listeye girer. ID alanı çakışmaması için negatif aralık (-OnayID)
 * kullanırız — manuel rapor ID'leri pozitif.
 */
async function listYayinlanmisNkrRaporlari(
  user: SessionUser
): Promise<RaporListItem[]> {
  const SELECT = `
    SELECT
      -o.ID AS OnayID, n.ID AS NkrID,
      o.YayinTarihi AS Tarih,
      n.RaporNo, TRY_CAST(n.Talep_No AS INT) AS TalepNo,
      f.Firma_Adi AS MusteriAd,
      o.RaporFormati,
      n.Numune_Adi AS NumuneAd,
      o.YayinUrl
    FROM cosmoroot.NKR_RaporOnay o
    INNER JOIN dbo.NKR n ON n.ID = o.NkrID
    LEFT JOIN dbo.Firma f ON f.ID = n.Firma_ID
  `;
  const WHERE_BASE = `
    o.YayinUrl IS NOT NULL
    AND LTRIM(RTRIM(o.YayinUrl)) <> ''
    AND n.Durum = N'Aktif'
  `;

  let rows: NkrRaw[];
  if (isAdmin(user)) {
    rows = await query<NkrRaw>(
      `${SELECT} WHERE ${WHERE_BASE} ORDER BY o.YayinTarihi DESC, o.ID DESC`
    );
  } else if (user.tur === "Plasiyer") {
    // NKR'de PlasiyerID yok; firma üzerinden eşleştir
    rows = await query<NkrRaw>(
      `${SELECT}
       WHERE ${WHERE_BASE} AND f.PlasiyerID = @pid
       ORDER BY o.YayinTarihi DESC, o.ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  } else {
    // Müşteri / Proje: kendi firmaları
    rows = await query<NkrRaw>(
      `${SELECT}
       WHERE ${WHERE_BASE} AND n.Firma_ID = @firmaId
       ORDER BY o.YayinTarihi DESC, o.ID DESC`,
      { firmaId: user.id }
    );
  }

  return rows.map((r) => ({
    ID: r.OnayID, // negatif: manuel ID'lerle çakışmaz
    Tarih: r.Tarih,
    "Dosya No": r.RaporNo ?? r.NkrID,
    TalepNo: r.TalepNo,
    "Müşteri": r.MusteriAd,
    Proje: null,
    "Dosya Türü": r.RaporFormati ?? "Rapor",
    "Dosya Adı": r.NumuneAd,
    RaporID: r.RaporNo != null ? `R-${r.RaporNo}` : null,
    Yol: r.YayinUrl,
  }));
}

export async function findRaporForUser(user: SessionUser, raporId: number) {
  const r = await queryOne<RaporListItem>(
    `SELECT TOP 1 ID, Tarih, [Dosya No], TalepNo, [Müşteri], Proje,
            [Dosya Türü], [Dosya Adı], RaporID, Yol
     FROM VIEW_RAPOR WHERE ID = @id AND Durum = 'Aktif'`,
    { id: raporId }
  );
  if (!r) return null;
  if (isAdmin(user)) return r;
  if (user.tur === "Müşteri" && r["Müşteri"] === user.firmaAdi) return r;
  if (
    user.tur === "Proje" &&
    (r.Proje === user.firmaAdi || r["Müşteri"] === user.firmaAdi)
  )
    return r;
  return null;
}

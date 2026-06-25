import { query, queryOne } from "@/lib/db-mysql";
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
  /** Müşteriye gösterilen dış rapor kodu (ör. "ÜGAM/GE26/K6HV"). */
  RaporKodu: string | null;
  Yol: string | null;
}

export async function listRaporlar(
  user: SessionUser
): Promise<RaporListItem[]> {
  return listYayinlanmisNkrRaporlari(user);
}

async function listManuelRaporlar(
  user: SessionUser
): Promise<RaporListItem[]> {
  if (isAdmin(user)) {
    return query<RaporListItem>(
      `SELECT ID, Tarih, \`Dosya No\`, TalepNo, \`Müşteri\`, Proje,
              \`Dosya Türü\`, \`Dosya Adı\`, RaporID, Yol
       FROM VIEW_RAPOR WHERE Durum = 'Aktif'
       ORDER BY Tarih DESC, ID DESC`
    );
  }
  if (user.tur === "Plasiyer") {
    return query<RaporListItem>(
      `SELECT ID, Tarih, \`Dosya No\`, TalepNo, \`Müşteri\`, Proje,
              \`Dosya Türü\`, \`Dosya Adı\`, RaporID, Yol
       FROM VIEW_RAPOR
       WHERE Durum = 'Aktif' AND PlasiyerID = @pid
       ORDER BY Tarih DESC, ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  }
  const scope = scopeByFirma(user, "musteri-proje");
  return query<RaporListItem>(
    `SELECT ID, Tarih, \`Dosya No\`, TalepNo, \`Müşteri\`, Proje,
            \`Dosya Türü\`, \`Dosya Adı\`, RaporID, Yol
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
  DisRaporKodu: string | null;
  TalepNo: number | null;
  MusteriAd: string | null;
  ProjeAd: string | null;
  RaporFormati: string | null;
  NumuneAd: string | null;
  YayinUrl: string | null;
}

async function listYayinlanmisNkrRaporlari(
  user: SessionUser
): Promise<RaporListItem[]> {
  const SELECT = `
    SELECT
      -o.ID AS OnayID, n.ID AS NkrID,
      o.YayinTarihi AS Tarih,
      n.RaporNo, o.DisRaporKodu, CAST(n.Talep_No AS SIGNED) AS TalepNo,
      f.Firma_Adi AS MusteriAd,
      (SELECT p.Firma_Adi FROM NumuneDetay d
         JOIN Firma p ON p.ID = d.ProjeID
        WHERE d.RaporID = n.ID AND d.ProjeID IS NOT NULL
        ORDER BY d.ID LIMIT 1) AS ProjeAd,
      o.RaporFormati,
      n.Numune_Adi AS NumuneAd,
      o.YayinUrl
    FROM NKR_RaporOnay o
    INNER JOIN NKR n ON n.ID = o.NkrID
    LEFT JOIN Firma f ON f.ID = n.Firma_ID
  `;
  const WHERE_BASE = `
    o.YayinUrl IS NOT NULL
    AND TRIM(o.YayinUrl) <> ''
    AND n.Durum = 'Aktif'
  `;

  let rows: NkrRaw[];
  if (isAdmin(user)) {
    rows = await query<NkrRaw>(
      `${SELECT} WHERE ${WHERE_BASE} ORDER BY o.YayinTarihi DESC, o.ID DESC`
    );
  } else if (user.tur === "Plasiyer") {
    rows = await query<NkrRaw>(
      `${SELECT}
       WHERE ${WHERE_BASE} AND f.PlasiyerID = @pid
       ORDER BY o.YayinTarihi DESC, o.ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  } else if (user.tur === "Proje") {
    // Proje firması: hem kendi numuneleri (Firma_ID) hem de müşterilerinin
    // numuneleri (NumuneDetay.ProjeID üzerinden bu firmaya bağlananlar).
    rows = await query<NkrRaw>(
      `${SELECT}
       WHERE ${WHERE_BASE} AND (
         n.Firma_ID = @firmaId
         OR EXISTS (
           SELECT 1 FROM NumuneDetay d
           WHERE d.RaporID = n.ID AND d.ProjeID = @firmaId
         )
       )
       ORDER BY o.YayinTarihi DESC, o.ID DESC`,
      { firmaId: user.id }
    );
  } else {
    // Müşteri / diğer: yalnızca kendi numuneleri
    rows = await query<NkrRaw>(
      `${SELECT}
       WHERE ${WHERE_BASE} AND n.Firma_ID = @firmaId
       ORDER BY o.YayinTarihi DESC, o.ID DESC`,
      { firmaId: user.id }
    );
  }

  return rows.map((r) => ({
    ID: r.OnayID,
    Tarih: r.Tarih,
    "Dosya No": r.RaporNo ?? r.NkrID,
    TalepNo: r.TalepNo,
    "Müşteri": r.MusteriAd,
    Proje: r.ProjeAd,
    "Dosya Türü": r.RaporFormati ?? "Rapor",
    "Dosya Adı": r.NumuneAd,
    RaporID: r.RaporNo != null ? `R-${r.RaporNo}` : null,
    RaporKodu: r.DisRaporKodu?.trim() || null,
    Yol: r.YayinUrl,
  }));
}

export async function findRaporForUser(
  user: SessionUser,
  raporId: number
): Promise<RaporListItem | null> {
  if (raporId < 0) return findNkrRaporForUser(user, -raporId);

  const r = await queryOne<RaporListItem>(
    `SELECT ID, Tarih, \`Dosya No\`, TalepNo, \`Müşteri\`, Proje,
            \`Dosya Türü\`, \`Dosya Adı\`, RaporID, Yol
     FROM VIEW_RAPOR WHERE ID = @id AND Durum = 'Aktif'
     LIMIT 1`,
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

async function findNkrRaporForUser(
  user: SessionUser,
  onayId: number
): Promise<RaporListItem | null> {
  interface NkrRow {
    OnayID: number;
    NkrID: number;
    Tarih: Date | null;
    RaporNo: number | null;
    DisRaporKodu: string | null;
    TalepNo: number | null;
    MusteriAd: string | null;
    RaporFormati: string | null;
    NumuneAd: string | null;
    YayinUrl: string | null;
    FirmaID: number | null;
    ProjeMatch: number | null;
  }
  const r = await queryOne<NkrRow>(
    `SELECT
       o.ID AS OnayID, n.ID AS NkrID,
       o.YayinTarihi AS Tarih,
       n.RaporNo, o.DisRaporKodu, CAST(n.Talep_No AS SIGNED) AS TalepNo,
       f.Firma_Adi AS MusteriAd,
       o.RaporFormati,
       n.Numune_Adi AS NumuneAd,
       o.YayinUrl,
       n.Firma_ID AS FirmaID,
       (SELECT COUNT(*) FROM NumuneDetay d
        WHERE d.RaporID = n.ID AND d.ProjeID = @uid) AS ProjeMatch
     FROM NKR_RaporOnay o
     INNER JOIN NKR n ON n.ID = o.NkrID
     LEFT JOIN Firma f ON f.ID = n.Firma_ID
     WHERE o.ID = @oid
       AND o.YayinUrl IS NOT NULL
       AND TRIM(o.YayinUrl) <> ''
       AND n.Durum = 'Aktif'
     LIMIT 1`,
    { oid: onayId, uid: user.id }
  );
  if (!r) return null;

  if (!isAdmin(user)) {
    if (user.tur === "Plasiyer") return null;
    // Müşteri: yalnızca kendi numunesi. Proje: kendi numunesi VEYA
    // NumuneDetay.ProjeID üzerinden kendisine bağlı müşteri numunesi.
    const sahip = r.FirmaID === user.id;
    const projeMatch = user.tur === "Proje" && (r.ProjeMatch ?? 0) > 0;
    if (!sahip && !projeMatch) return null;
  }

  return {
    ID: -r.OnayID,
    Tarih: r.Tarih,
    "Dosya No": r.RaporNo ?? r.NkrID,
    TalepNo: r.TalepNo,
    "Müşteri": r.MusteriAd,
    Proje: null,
    "Dosya Türü": r.RaporFormati ?? "Rapor",
    "Dosya Adı": r.NumuneAd,
    RaporID: r.RaporNo != null ? `R-${r.RaporNo}` : null,
    RaporKodu: r.DisRaporKodu?.trim() || null,
    Yol: r.YayinUrl,
  };
}

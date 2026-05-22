import { query, queryOne } from "@/lib/db";
import { scopeByFirma, isAdmin } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface TeklifListItem {
  ID: number;
  "Teklif No": string;
  Tarih: Date | null;
  Tur: string | null;
  "Müşteri": string | null;
  Proje: string | null;
  Aciklama: string | null;
  Durum: string | null;
}

export async function listTeklifler(
  user: SessionUser
): Promise<TeklifListItem[]> {
  if (isAdmin(user)) {
    return query<TeklifListItem>(
      `SELECT ID, [Teklif No], Tarih, Tur, [Müşteri], Proje, Aciklama, Durum
       FROM VIEW_TEKLIFLERIM ORDER BY Tarih DESC, ID DESC`
    );
  }
  if (user.tur === "Plasiyer") {
    return query<TeklifListItem>(
      `SELECT ID, [Teklif No], Tarih, Tur, [Müşteri], Proje, Aciklama, Durum
       FROM VIEW_TEKLIFLERIM
       WHERE PlasiyerID = @pid
       ORDER BY Tarih DESC, ID DESC`,
      { pid: user.plasiyerId ?? -1 }
    );
  }
  const scope = scopeByFirma(user, "musteri-proje");
  return query<TeklifListItem>(
    `SELECT ID, [Teklif No], Tarih, Tur, [Müşteri], Proje, Aciklama, Durum
     FROM VIEW_TEKLIFLERIM
     WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export interface TeklifBaslik {
  ID: number;
  TeklifNo: number;
  TeklifTuru: string | null;
  Tarih: Date | null;
  ParaBirimi: string | null;
  TeklifDurum: string | null;
  OnayTarih: Date | null;
  Aciklama: string | null;
  FirmaID: number | null;
  Firma_Adi: string | null;
  FirmaAdres: string | null;
  Telefon: string | null;
  Mail: string | null;
}

export interface TeklifSatir {
  ID: number;
  Akreditasyon: string | null;
  Hizmet: string | null;
  Metot: string | null;
  "Test Süresi (Gün)": number | null;
  "Numune Miktarı": string | null;
  "Birim Fiyat": string;
  Adet: number | null;
  Toplam: string;
}

export async function getTeklifDetail(teklifNo: number) {
  const baslik = await queryOne<TeklifBaslik>(
    `SELECT t.ID, t.TeklifNo, t.TeklifTuru, t.Tarih, t.ParaBirimi, t.TeklifDurum,
            t.OnayTarih, t.Aciklama, t.FirmaID,
            f.Firma_Adi, f.Adres AS FirmaAdres, f.Telefon, f.Mail
     FROM TeklifX1 t
     LEFT JOIN Firma f ON f.ID = t.FirmaID
     WHERE t.TeklifNo = @no`,
    { no: teklifNo }
  );
  if (!baslik) return { baslik: null, satirlar: [] };

  const view =
    (baslik.TeklifTuru ?? "").toLowerCase().includes("paket")
      ? "VIEW_TEKLIF_DETAY_PAKET"
      : "VIEW_TEKLIF_DETAY_ANALIZ";

  const satirlar = await query<TeklifSatir>(
    `SELECT * FROM ${view} WHERE TeklifNo = @no ORDER BY ID`,
    { no: teklifNo }
  );

  return { baslik, satirlar };
}

export async function findTeklifByListId(id: number) {
  return queryOne<{ TeklifNo: number }>(
    `SELECT TOP 1 TeklifNo FROM TeklifX1 WHERE ID = @id`,
    { id }
  );
}

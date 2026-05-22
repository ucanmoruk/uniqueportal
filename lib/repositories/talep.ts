import { query, queryOne } from "@/lib/db";
import { scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface TalepListeItem {
  ID: number;
  "Talep No": string;
  Tarih: Date | null;
  "Talep Oluşturan": string | null;
  "Müşteri": string | null;
  Durum: string | null;
  FirmaKodu: string | null;
}

export async function listTalepler(
  user: SessionUser
): Promise<TalepListeItem[]> {
  const scope = scopeByFirma(user, "firmakodu");
  return query<TalepListeItem>(
    `SELECT ID, [Talep No], Tarih, [Talep Oluşturan], [Müşteri], Durum, FirmaKodu
     FROM VIEW_TALEP_LISTE
     WHERE ${scope.clause}
     ORDER BY Tarih DESC, ID DESC`,
    scope.params
  );
}

export interface TalepDetail {
  talep: {
    ID: number;
    TalepNo: number;
    Tarih: Date | null;
    FirmaKodu: string | null;
    Durum: string | null;
    Tur: string | null;
  } | null;
  raporlama: {
    Firma: string | null;
    Adres: string | null;
    Yetkili: string | null;
    Iletisim: string | null;
    Karar: string | null;
    Dil: string | null;
    Iade: string | null;
    UreticiFirma: string | null;
    Note: string | null;
  } | null;
  fatura: {
    Firma: string | null;
    Adres: string | null;
    VergiDairesi: string | null;
    VergiNo: string | null;
    Mail: string | null;
  } | null;
  numuneler: Array<{
    ID: number;
    Numune: string | null;
    Ozellik: string | null;
    Analiz: string | null;
    Metot: string | null;
  }>;
}

export async function getTalepDetail(
  user: SessionUser,
  id: number
): Promise<TalepDetail> {
  // Önce talebi getir, sonra erişim hakkını kontrol et.
  const talep = await queryOne<{
    ID: number;
    TalepNo: number;
    Tarih: Date | null;
    FirmaKodu: string | null;
    Durum: string | null;
    Tur: string | null;
  }>(
    `SELECT ID, TalepNo, Tarih, FirmaKodu, Durum, Tur
     FROM Talep WHERE ID = @id`,
    { id }
  );

  if (!talep) {
    return { talep: null, raporlama: null, fatura: null, numuneler: [] };
  }

  // Erişim kontrolü: Admin değilse FirmaKodu eşleşmesi şart.
  if (user.tur !== "Admin" && talep.FirmaKodu !== user.kod) {
    return { talep: null, raporlama: null, fatura: null, numuneler: [] };
  }

  const [raporlama, fatura, numuneler] = await Promise.all([
    queryOne<{
      Firma: string | null;
      Adres: string | null;
      Yetkili: string | null;
      Iletisim: string | null;
      Karar: string | null;
      Dil: string | null;
      Iade: string | null;
      UreticiFirma: string | null;
      Note: string | null;
    }>(
      `SELECT Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note
       FROM TalepRaporlama WHERE TalepID = @id`,
      { id }
    ),
    queryOne<{
      Firma: string | null;
      Adres: string | null;
      VergiDairesi: string | null;
      VergiNo: string | null;
      Mail: string | null;
    }>(
      `SELECT Firma, Adres, VergiDairesi, VergiNo, Mail
       FROM TalepFatura WHERE TalepID = @id`,
      { id }
    ),
    query<{
      ID: number;
      Numune: string | null;
      Ozellik: string | null;
      Analiz: string | null;
      Metot: string | null;
    }>(
      `SELECT ID, Numune, Ozellik, Analiz, Metot
       FROM TalepNumune WHERE TalepID = @id ORDER BY ID`,
      { id }
    ),
  ]);

  return { talep, raporlama, fatura, numuneler };
}

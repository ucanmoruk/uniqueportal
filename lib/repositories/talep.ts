import { query, queryOne, getPool, sql } from "@/lib/db";
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

export interface YeniTalepInput {
  user: SessionUser;
  raporlama: {
    Firma: string;
    Adres: string;
    Yetkili: string;
    Iletisim: string;
    Karar: string;
    Dil: string;
    Iade: string;
    UreticiFirma: string;
    Note: string;
  };
  fatura: {
    Firma: string;
    Adres: string;
    VergiDairesi: string;
    VergiNo: string;
    Mail: string;
  };
  numuneler: Array<{
    Numune: string;
    Ozellik: string;
    Analiz: string;
    Metot: string;
  }>;
  sozlesme: number;
}

export async function createTalep(input: YeniTalepInput): Promise<number> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1) Sonraki TalepNo (mevcut PHP davranışına paralel: TOP 1 ORDER BY ID DESC + 1)
    const last = await new sql.Request(tx).query<{ TalepNo: number | null }>(
      `SELECT TOP 1 TalepNo FROM Talep ORDER BY ID DESC`
    );
    const lastNo = Number(last.recordset?.[0]?.TalepNo ?? 0);
    const yeniNo = lastNo + 1;

    // 2) Talep
    const talepReq = new sql.Request(tx)
      .input("tarih", sql.Date, new Date())
      .input("kod", sql.NVarChar(10), input.user.kod ?? "")
      .input("sozlesme", sql.Int, input.sozlesme ? 1 : 0)
      .input("durum", sql.NVarChar(20), "Yeni Talep")
      .input("talepNo", sql.Int, yeniNo)
      .input("yetkili", sql.Int, 0)
      .input("tur", sql.NVarChar(6), "Web")
      .input("olusturan", sql.Int, input.user.id);

    const inserted = await talepReq.query<{ ID: number }>(
      `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, Yetkili, Tur, Olusturan)
       OUTPUT INSERTED.ID
       VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @yetkili, @tur, @olusturan)`
    );
    const talepId = inserted.recordset[0].ID;

    // 3) TalepRaporlama
    const r = input.raporlama;
    await new sql.Request(tx)
      .input("tid", sql.Int, talepId)
      .input("firma", sql.NVarChar(sql.MAX), r.Firma ?? "")
      .input("adres", sql.NVarChar(sql.MAX), r.Adres ?? "")
      .input("yetkili", sql.NVarChar(150), r.Yetkili ?? "")
      .input("iletisim", sql.NVarChar(150), r.Iletisim ?? "")
      .input("karar", sql.NVarChar(30), r.Karar ?? "")
      .input("dil", sql.NVarChar(25), r.Dil ?? "Türkçe")
      .input("iade", sql.NVarChar(10), r.Iade ?? "Hayır")
      .input("uretici", sql.NVarChar(sql.MAX), r.UreticiFirma ?? "")
      .input("note", sql.NVarChar(sql.MAX), r.Note ?? "")
      .query(
        `INSERT INTO TalepRaporlama
         (TalepID, Firma, Adres, Yetkili, Iletisim, Karar, Dil, Iade, UreticiFirma, Note)
         VALUES (@tid, @firma, @adres, @yetkili, @iletisim, @karar, @dil, @iade, @uretici, @note)`
      );

    // 4) TalepFatura
    const f = input.fatura;
    await new sql.Request(tx)
      .input("tid", sql.Int, talepId)
      .input("firma", sql.NVarChar(sql.MAX), f.Firma ?? "")
      .input("adres", sql.NVarChar(sql.MAX), f.Adres ?? "")
      .input("vd", sql.NVarChar(50), f.VergiDairesi ?? "")
      .input("vno", sql.NVarChar(15), f.VergiNo ?? "")
      .input("mail", sql.NVarChar(150), f.Mail ?? "")
      .query(
        `INSERT INTO TalepFatura (TalepID, Firma, Adres, VergiDairesi, VergiNo, Mail)
         VALUES (@tid, @firma, @adres, @vd, @vno, @mail)`
      );

    // 5) Numuneler
    for (const n of input.numuneler) {
      if (!n.Numune?.trim() && !n.Analiz?.trim()) continue;
      await new sql.Request(tx)
        .input("tid", sql.Int, talepId)
        .input("numune", sql.NVarChar(250), n.Numune ?? "")
        .input("ozellik", sql.NVarChar(250), n.Ozellik ?? "")
        .input("analiz", sql.NVarChar(250), n.Analiz ?? "")
        .input("metot", sql.NVarChar(250), n.Metot ?? "")
        .query(
          `INSERT INTO TalepNumune (TalepID, Numune, Ozellik, Analiz, Metot)
           VALUES (@tid, @numune, @ozellik, @analiz, @metot)`
        );
    }

    await tx.commit();
    return talepId;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

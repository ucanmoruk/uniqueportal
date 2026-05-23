import { query, queryOne, getPool, sql } from "@/lib/db";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export interface DestekListItem {
  ID: number;
  TALEP_ID: number;
  "Talep No": string;
  Tarih: Date | null;
  "Talep Oluşturan": string | null;
  Konu: string | null;
  Durum: string | null;
  FirmaKodu: string | null;
}

export async function listDestek(user: SessionUser): Promise<DestekListItem[]> {
  if (isAdmin(user)) {
    return query<DestekListItem>(
      `SELECT ID, TALEP_ID, [Talep No], Tarih, [Talep Oluşturan], Konu, Durum, FirmaKodu
       FROM VIEW_DESTEK_TALEBI ORDER BY Tarih DESC, TALEP_ID DESC`
    );
  }
  const scope = scopeByFirma(user, "firmakodu");
  return query<DestekListItem>(
    `SELECT ID, TALEP_ID, [Talep No], Tarih, [Talep Oluşturan], Konu, Durum, FirmaKodu
     FROM VIEW_DESTEK_TALEBI WHERE ${scope.clause}
     ORDER BY Tarih DESC, TALEP_ID DESC`,
    scope.params
  );
}

export interface DestekHeader {
  ID: number;
  TalepID: number;
  DESTEK_NO: string | null;
  BASLIK: string | null;
  ACIKLAMA: string | null;
  KAYIT_TARIHI: string | null;
  TUR: string | null;
  KONU_TUR: number | null;
  Durum: string | null;
  Tarih: Date | null;
  FirmaKodu: string | null;
  KayitEdenFirma: string | null;
}

export interface DestekMesaj {
  DETAY_ID: number;
  DESTEK_REF: number;
  MESAJ: string | null;
  MESAJ_TARIHI: string | null;
  KAYIT_EDEN: number | null;
  DETAY_DOSYA: string | null;
  GonderenFirma: string | null;
  GonderenTur: string | null;
}

export async function getDestekDetail(
  user: SessionUser,
  talepId: number
): Promise<{
  header: DestekHeader | null;
  mesajlar: DestekMesaj[];
}> {
  const header = await queryOne<DestekHeader>(
    `SELECT TOP 1 d.ID, d.TalepID, d.DESTEK_NO, d.BASLIK, d.ACIKLAMA,
            d.KAYIT_TARIHI, d.TUR, d.KONU_TUR, d.Durum, d.Tarih, d.FirmaKodu,
            f.Firma_Adi AS KayitEdenFirma
     FROM DESTEK d
     LEFT JOIN Firma f ON f.ID = d.KAYIT_EDEN
     WHERE d.TalepID = @id`,
    { id: talepId }
  );
  if (!header) return { header: null, mesajlar: [] };

  // Erişim kontrolü
  if (!isAdmin(user) && header.FirmaKodu !== user.kod) {
    return { header: null, mesajlar: [] };
  }

  const mesajlar = await query<DestekMesaj>(
    `SELECT dd.DETAY_ID, dd.DESTEK_REF, dd.MESAJ, dd.MESAJ_TARIHI, dd.KAYIT_EDEN,
            dd.DETAY_DOSYA, f.Firma_Adi AS GonderenFirma, f.Tur AS GonderenTur
     FROM DESTEK_DETAY dd
     LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
     WHERE dd.DESTEK_REF = @id
     ORDER BY dd.DETAY_ID ASC`,
    { id: talepId }
  );

  return { header, mesajlar };
}

export async function addDestekMesaj(
  user: SessionUser,
  talepId: number,
  mesaj: string
): Promise<void> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // Erişim doğrula
    const t = await new sql.Request(tx)
      .input("id", sql.Int, talepId)
      .query<{ FirmaKodu: string | null }>(
        `SELECT TOP 1 FirmaKodu FROM DESTEK WHERE TalepID = @id`
      );
    const firmaKodu = t.recordset[0]?.FirmaKodu;
    if (!firmaKodu) throw new Error("Destek talebi bulunamadı.");
    if (!isAdmin(user) && firmaKodu !== user.kod) {
      throw new Error("Bu talebe erişim yetkiniz yok.");
    }

    const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");
    await new sql.Request(tx)
      .input("ref", sql.Int, talepId)
      .input("mesaj", sql.Text, mesaj)
      .input("tarih", sql.VarChar(50), tarih)
      .input("kim", sql.Int, user.id)
      .query(
        `INSERT INTO DESTEK_DETAY (DESTEK_REF, MESAJ, MESAJ_TARIHI, KAYIT_EDEN)
         VALUES (@ref, @mesaj, @tarih, @kim)`
      );

    // Durum güncelle: Admin yanıtladıysa "Yanıtlandı", müşteri yanıtladıysa "Müşteri Yanıtı"
    const yeniDurum = isAdmin(user) ? "Yanıtlandı" : "Müşteri Yanıtı";
    await new sql.Request(tx)
      .input("id", sql.Int, talepId)
      .input("durum", sql.NVarChar(20), yeniDurum)
      .query(`UPDATE Talep SET Durum = @durum WHERE ID = @id`);

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function createDestekTalep(
  user: SessionUser,
  data: { baslik: string; aciklama: string }
): Promise<number> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // 1) Sonraki TalepNo
    const last = await new sql.Request(tx).query<{ TalepNo: number | null }>(
      `SELECT TOP 1 TalepNo FROM Talep ORDER BY ID DESC`
    );
    const yeniNo = Number(last.recordset?.[0]?.TalepNo ?? 0) + 1;

    // 2) Talep
    const inserted = await new sql.Request(tx)
      .input("tarih", sql.Date, new Date())
      .input("kod", sql.NVarChar(10), user.kod ?? "")
      .input("sozlesme", sql.Int, 0)
      .input("durum", sql.NVarChar(20), "Yeni Talep")
      .input("talepNo", sql.Int, yeniNo)
      .input("yetkili", sql.Int, 0)
      .input("tur", sql.NVarChar(6), "Destek")
      .input("olusturan", sql.Int, user.id)
      .query<{ ID: number }>(
        `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, Yetkili, Tur, Olusturan)
         OUTPUT INSERTED.ID
         VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @yetkili, @tur, @olusturan)`
      );
    const talepId = inserted.recordset[0].ID;

    // 3) DESTEK kaydı
    const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");
    await new sql.Request(tx)
      .input("no", sql.VarChar(100), `D${yeniNo}`)
      .input("tur", sql.NVarChar(6), "Web")
      .input("konu", sql.TinyInt, 1)
      .input("baslik", sql.VarChar(255), data.baslik)
      .input("aciklama", sql.Text, data.aciklama)
      .input("kt", sql.VarChar(50), tarih)
      .input("kim", sql.Int, user.id)
      .input("durum", sql.NVarChar(20), "Yeni Talep")
      .input("tarihD", sql.Date, new Date())
      .input("kod", sql.NVarChar(10), user.kod ?? "")
      .input("soz", sql.Int, 0)
      .input("tid", sql.Int, talepId)
      .query(
        `INSERT INTO DESTEK
         (DESTEK_NO, TUR, KONU_TUR, BASLIK, ACIKLAMA, KAYIT_TARIHI, KAYIT_EDEN,
          Durum, Tarih, FirmaKodu, Sozlesme, TalepID)
         VALUES (@no, @tur, @konu, @baslik, @aciklama, @kt, @kim, @durum, @tarihD, @kod, @soz, @tid)`
      );

    // 4) İlk mesaj
    await new sql.Request(tx)
      .input("ref", sql.Int, talepId)
      .input("mesaj", sql.Text, data.aciklama)
      .input("tarih", sql.VarChar(50), tarih)
      .input("kim", sql.Int, user.id)
      .query(
        `INSERT INTO DESTEK_DETAY (DESTEK_REF, MESAJ, MESAJ_TARIHI, KAYIT_EDEN)
         VALUES (@ref, @mesaj, @tarih, @kim)`
      );

    await tx.commit();
    return talepId;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

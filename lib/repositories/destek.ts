import { query, queryOne, getPool, sql } from "@/lib/db";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

// isAdmin yukarıdan import edildi — listUserRelatedItems içinde kullanılır

/**
 * Firma adının ilk 2 harfi + firmaya özel sıra numarası ile destek talep no üretir.
 * Format: #XX/DT{N}  (ör: #CO/DT1, #CO/DT2)
 */
export async function generateDestekNo(
  txOrPool: import("mssql").Transaction | import("mssql").ConnectionPool,
  firmaKodu: string
): Promise<string> {
  const req1 = new sql.Request(txOrPool as any);
  req1.input("kod", sql.NVarChar(10), firmaKodu);
  const firmaResult = await req1.query<{ Firma_Adi: string | null }>(
    `SELECT TOP 1 Firma_Adi FROM Firma WHERE Kod = @kod`
  );
  const firmaAdi = firmaResult.recordset[0]?.Firma_Adi ?? "";
  const prefix = firmaAdi
    .replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "")
    .slice(0, 2)
    .toUpperCase();

  const req2 = new sql.Request(txOrPool as any);
  req2.input("kod2", sql.NVarChar(10), firmaKodu);
  const countResult = await req2.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM DESTEK WHERE FirmaKodu = @kod2`
  );
  const sira = (countResult.recordset[0]?.cnt ?? 0) + 1;

  return `#${prefix}/DT${sira}`;
}

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
      `SELECT v.ID, v.TALEP_ID, d.DESTEK_NO AS [Talep No], v.Tarih,
              v.[Talep Oluşturan], v.Konu, v.Durum, v.FirmaKodu
       FROM VIEW_DESTEK_TALEBI v
       INNER JOIN DESTEK d ON d.TalepID = v.TALEP_ID
       ORDER BY v.Tarih DESC, v.TALEP_ID DESC`
    );
  }
  const scope = scopeByFirma(user, "firmakodu");
  const qualified = scope.clause.replace(/\b(FirmaKodu)\b/, "v.$1");
  return query<DestekListItem>(
    `SELECT v.ID, v.TALEP_ID, d.DESTEK_NO AS [Talep No], v.Tarih,
            v.[Talep Oluşturan], v.Konu, v.Durum, v.FirmaKodu
     FROM VIEW_DESTEK_TALEBI v
     INNER JOIN DESTEK d ON d.TalepID = v.TALEP_ID
     WHERE ${qualified}
     ORDER BY v.Tarih DESC, v.TALEP_ID DESC`,
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

  const rawMesajlar = await query<DestekMesaj & { GonderenKod: string | null }>(
    `SELECT dd.DETAY_ID, dd.DESTEK_REF, dd.MESAJ, dd.MESAJ_TARIHI, dd.KAYIT_EDEN,
            dd.DETAY_DOSYA, f.Firma_Adi AS GonderenFirma, f.Tur AS GonderenTur,
            f.Kod AS GonderenKod
     FROM DESTEK_DETAY dd
     LEFT JOIN Firma f ON f.ID = dd.KAYIT_EDEN
     WHERE dd.DESTEK_REF = @id
     ORDER BY dd.DETAY_ID ASC`,
    { id: talepId }
  );

  const musteriKodu = (header.FirmaKodu ?? "").trim();
  const mesajlar: DestekMesaj[] = rawMesajlar.map((m) => {
    const rawTur = (m.GonderenTur ?? "").trim();
    const senderKod = (m.GonderenKod ?? "").trim();
    const isMusteri =
      rawTur !== "Admin" &&
      rawTur !== "Plasiyer" &&
      musteriKodu.length > 0 &&
      senderKod === musteriKodu;
    return {
      DETAY_ID: m.DETAY_ID,
      DESTEK_REF: m.DESTEK_REF,
      MESAJ: m.MESAJ,
      MESAJ_TARIHI: m.MESAJ_TARIHI,
      KAYIT_EDEN: m.KAYIT_EDEN,
      DETAY_DOSYA: m.DETAY_DOSYA,
      GonderenFirma: isMusteri
        ? (m.GonderenFirma ?? header.KayitEdenFirma ?? "Müşteri")
        : "UNIQUE Services",
      GonderenTur: isMusteri ? "musteri" : "admin",
    };
  });

  return { header, mesajlar };
}

import { sendText, toWhatsAppAddress, isWhatsAppEnabled } from "@/lib/whatsapp";

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

    // Admin yanıtı + WhatsApp etkin + ticket WA kaynaklı ise WhatsApp ile gönder
    if (isAdmin(user) && isWhatsAppEnabled()) {
      try {
        const ticket = await queryOne<{
          TUR: string | null;
          MusteriTelefon: string | null;
          MusteriFirma: string | null;
          Baslik: string | null;
        }>(
          `SELECT TOP 1 d.TUR, mf.Telefon AS MusteriTelefon,
                  mf.Firma_Adi AS MusteriFirma, d.BASLIK AS Baslik
           FROM DESTEK d
           LEFT JOIN Firma mf ON mf.Kod = d.FirmaKodu
           WHERE d.TalepID = @id`,
          { id: talepId }
        );

        if (ticket?.MusteriTelefon) {
          const wa = toWhatsAppAddress(ticket.MusteriTelefon);
          if (wa) {
            await sendText(
              wa,
              `${ticket.MusteriFirma ?? ""}, "${ticket.Baslik ?? "Destek"}" talebinize yanıt:\n\n${mesaj}`
            );
          }
        }
      } catch (err) {
        console.error("[addDestekMesaj] WhatsApp gönderim hatası:", err);
        // WhatsApp hatası transaction'ı bozmaz
      }
    }
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export interface UserRelatedItem {
  type: "Teklif" | "Rapor" | "Fatura";
  id: number;
  label: string;
  subtitle: string;
}

export async function listUserRelatedItems(
  user: SessionUser
): Promise<UserRelatedItem[]> {
  // Admin destek açtığında kendi adına ilgili kayıt seçmez; bu da
  // büyük view'larda yavaş scan yaratır. Admin için boş dön.
  if (isAdmin(user)) return [];

  const items: UserRelatedItem[] = [];

  // Teklifler (son 50) — yeni TeklifBaslik tablosundan, taslak olanlar hariç.
  const teklifler = await query<{
    ID: number;
    TeklifNoText: string;
    Tarih: Date | null;
    Notlar: string | null;
  }>(
    `SELECT TOP 50
        tb.ID,
        COALESCE(tb.DisTeklifKodu, CONCAT('UQ', CAST(tb.TeklifNo AS varchar)))
          + '/' + RIGHT('00' + CAST(tb.RevNo AS varchar), 2) AS TeklifNoText,
        tb.Tarih,
        tb.Notlar
     FROM cosmoroot.TeklifBaslik tb
     WHERE tb.MusteriID = @id
       AND tb.Durum = 'Aktif'
       AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
     ORDER BY tb.Tarih DESC, tb.ID DESC`,
    { id: user.id }
  ).catch(() => []);

  for (const t of teklifler) {
    items.push({
      type: "Teklif",
      id: t.ID,
      label: t.TeklifNoText,
      subtitle: t.Notlar ?? "",
    });
  }

  // Raporlar (son 50, firma adına göre)
  if (user.firmaAdi) {
    const raporlar = await query<{
      ID: number;
      RaporID: string | null;
      "Dosya Adı": string | null;
      Tarih: Date | null;
    }>(
      `SELECT TOP 50 ID, RaporID, [Dosya Adı], Tarih
       FROM VIEW_RAPOR
       WHERE Durum = 'Aktif' AND ([Müşteri] = @firma OR Proje = @firma)
       ORDER BY Tarih DESC, ID DESC`,
      { firma: user.firmaAdi }
    ).catch(() => []);
    for (const r of raporlar) {
      items.push({
        type: "Rapor",
        id: r.ID,
        label: r.RaporID ?? `#${r.ID}`,
        subtitle: r["Dosya Adı"] ?? "",
      });
    }
  }

  // Faturalar (son 50)
  const faturalar = await query<{
    ID: number;
    "Fatura No": string;
    Tarih: Date | null;
  }>(
    `SELECT TOP 50 ID, [Fatura No], Tarih
     FROM VIEW_FATURA
     WHERE FaturaFirmaID = @id OR Proje_ID = @id
     ORDER BY Tarih DESC, ID DESC`,
    { id: user.id }
  ).catch(() => []);
  for (const f of faturalar) {
    items.push({
      type: "Fatura",
      id: f.ID,
      label: f["Fatura No"],
      subtitle: "",
    });
  }

  return items;
}

export async function createDestekTalep(
  user: SessionUser,
  data: {
    baslik: string;
    aciklama: string;
    ilgili?: { type: "Teklif" | "Rapor" | "Fatura"; id: number; label: string } | null;
  }
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

    // 3) DESTEK kaydı — ilgili kayıt varsa açıklamanın başına etiket gömüyoruz
    const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");
    const destekNo = await generateDestekNo(tx, user.kod ?? "");
    const aciklamaTam = data.ilgili
      ? `[İlgili: ${data.ilgili.type} ${data.ilgili.label}]\n\n${data.aciklama}`
      : data.aciklama;
    await new sql.Request(tx)
      .input("no", sql.VarChar(100), destekNo)
      .input("tur", sql.NVarChar(6), "Web")
      .input("konu", sql.TinyInt, 1)
      .input("baslik", sql.VarChar(255), data.baslik)
      .input("aciklama", sql.Text, aciklamaTam)
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

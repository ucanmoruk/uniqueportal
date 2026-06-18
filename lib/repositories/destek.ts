import {
  query,
  queryOne,
  withTransaction,
  insertAndGetId,
  queryOneConn,
  executeConn,
  type PoolConnection,
} from "@/lib/db-mysql";
import { isAdmin, scopeByFirma } from "@/lib/permissions";
import type { SessionUser } from "@/types/db";

export async function generateDestekNo(
  conn: PoolConnection,
  firmaKodu: string
): Promise<string> {
  const firmaResult = await queryOneConn<{ Firma_Adi: string | null }>(
    conn,
    `SELECT Firma_Adi FROM Firma WHERE Kod = @kod LIMIT 1`,
    { kod: firmaKodu }
  );
  const firmaAdi = firmaResult?.Firma_Adi ?? "";
  const prefix = firmaAdi
    .replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "")
    .slice(0, 2)
    .toUpperCase();

  const countResult = await queryOneConn<{ cnt: number }>(
    conn,
    `SELECT COUNT(*) AS cnt FROM DESTEK WHERE FirmaKodu = @kod2`,
    { kod2: firmaKodu }
  );
  const sira = (countResult?.cnt ?? 0) + 1;

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
      `SELECT v.ID, v.TALEP_ID, d.DESTEK_NO AS \`Talep No\`, v.Tarih,
              v.\`Talep Oluşturan\`, v.Konu, v.Durum, v.FirmaKodu
       FROM VIEW_DESTEK_TALEBI v
       INNER JOIN DESTEK d ON d.TalepID = v.TALEP_ID
       ORDER BY v.Tarih DESC, v.TALEP_ID DESC`
    );
  }
  const scope = scopeByFirma(user, "firmakodu");
  const qualified = scope.clause.replace(/\b(FirmaKodu)\b/, "v.$1");
  return query<DestekListItem>(
    `SELECT v.ID, v.TALEP_ID, d.DESTEK_NO AS \`Talep No\`, v.Tarih,
            v.\`Talep Oluşturan\`, v.Konu, v.Durum, v.FirmaKodu
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
    `SELECT d.ID, d.TalepID, d.DESTEK_NO, d.BASLIK, d.ACIKLAMA,
            d.KAYIT_TARIHI, d.TUR, d.KONU_TUR, d.Durum, d.Tarih, d.FirmaKodu,
            f.Firma_Adi AS KayitEdenFirma
     FROM DESTEK d
     LEFT JOIN Firma f ON f.ID = d.KAYIT_EDEN
     WHERE d.TalepID = @id
     LIMIT 1`,
    { id: talepId }
  );
  if (!header) return { header: null, mesajlar: [] };

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
  await withTransaction(async (conn) => {
    const t = await queryOneConn<{ FirmaKodu: string | null }>(
      conn,
      `SELECT FirmaKodu FROM DESTEK WHERE TalepID = @id LIMIT 1`,
      { id: talepId }
    );
    const firmaKodu = t?.FirmaKodu;
    if (!firmaKodu) throw new Error("Destek talebi bulunamadı.");
    if (!isAdmin(user) && firmaKodu !== user.kod) {
      throw new Error("Bu talebe erişim yetkiniz yok.");
    }

    const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");
    await executeConn(
      conn,
      `INSERT INTO DESTEK_DETAY (DESTEK_REF, MESAJ, MESAJ_TARIHI, KAYIT_EDEN)
       VALUES (@ref, @mesaj, @tarih, @kim)`,
      { ref: talepId, mesaj, tarih, kim: user.id }
    );

    const yeniDurum = isAdmin(user) ? "Yanıtlandı" : "Müşteri Yanıtı";
    await executeConn(
      conn,
      `UPDATE Talep SET Durum = @durum WHERE ID = @id`,
      { id: talepId, durum: yeniDurum }
    );
  });

  if (isAdmin(user) && isWhatsAppEnabled()) {
    try {
      const ticket = await queryOne<{
        TUR: string | null;
        MusteriTelefon: string | null;
        MusteriFirma: string | null;
        Baslik: string | null;
      }>(
        `SELECT d.TUR, mf.Telefon AS MusteriTelefon,
                mf.Firma_Adi AS MusteriFirma, d.BASLIK AS Baslik
         FROM DESTEK d
         LEFT JOIN Firma mf ON mf.Kod = d.FirmaKodu
         WHERE d.TalepID = @id
         LIMIT 1`,
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
    }
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
  if (isAdmin(user)) return [];

  const items: UserRelatedItem[] = [];

  const teklifler = await query<{
    ID: number;
    TeklifNoText: string;
    Tarih: Date | null;
    Notlar: string | null;
  }>(
    `SELECT
        tb.ID,
        CONCAT(
          COALESCE(tb.DisTeklifKodu, CONCAT('UQ', tb.TeklifNo)),
          '/',
          LPAD(tb.RevNo, 2, '0')
        ) AS TeklifNoText,
        tb.Tarih,
        tb.Notlar
     FROM TeklifBaslik tb
     WHERE tb.MusteriID = @id
       AND tb.Durum = 'Aktif'
       AND (tb.TeklifDurum IS NULL OR tb.TeklifDurum NOT IN ('Taslak','Hazırlanıyor','Hazirlaniyor','Draft'))
     ORDER BY tb.Tarih DESC, tb.ID DESC
     LIMIT 50`,
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

  if (user.firmaAdi) {
    const raporlar = await query<{
      ID: number;
      RaporID: string | null;
      "Dosya Adı": string | null;
      Tarih: Date | null;
    }>(
      `SELECT ID, RaporID, \`Dosya Adı\`, Tarih
       FROM VIEW_RAPOR
       WHERE Durum = 'Aktif' AND (\`Müşteri\` = @firma OR Proje = @firma)
       ORDER BY Tarih DESC, ID DESC
       LIMIT 50`,
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

  const faturalar = await query<{
    ID: number;
    "Fatura No": string;
    Tarih: Date | null;
  }>(
    `SELECT ID, \`Fatura No\`, Tarih
     FROM VIEW_FATURA
     WHERE FaturaFirmaID = @id OR Proje_ID = @id
     ORDER BY Tarih DESC, ID DESC
     LIMIT 50`,
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
  return withTransaction(async (conn) => {
    const last = await queryOneConn<{ TalepNo: number | null }>(
      conn,
      `SELECT TalepNo FROM Talep ORDER BY ID DESC LIMIT 1`
    );
    const yeniNo = Number(last?.TalepNo ?? 0) + 1;

    const talepId = await insertAndGetId(
      conn,
      `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, Yetkili, Tur, Olusturan)
       VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @yetkili, @tur, @olusturan)`,
      {
        tarih: new Date(),
        kod: user.kod ?? "",
        sozlesme: 0,
        durum: "Yeni Talep",
        talepNo: yeniNo,
        yetkili: 0,
        tur: "Destek",
        olusturan: user.id,
      }
    );

    const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");
    const destekNo = await generateDestekNo(conn, user.kod ?? "");
    const aciklamaTam = data.ilgili
      ? `[İlgili: ${data.ilgili.type} ${data.ilgili.label}]\n\n${data.aciklama}`
      : data.aciklama;
    await executeConn(
      conn,
      `INSERT INTO DESTEK
       (DESTEK_NO, TUR, KONU_TUR, BASLIK, ACIKLAMA, KAYIT_TARIHI, KAYIT_EDEN,
        Durum, Tarih, FirmaKodu, Sozlesme, TalepID)
       VALUES (@no, @tur, @konu, @baslik, @aciklama, @kt, @kim, @durum, @tarihD, @kod, @soz, @tid)`,
      {
        no: destekNo,
        tur: "Web",
        konu: 1,
        baslik: data.baslik,
        aciklama: aciklamaTam,
        kt: tarih,
        kim: user.id,
        durum: "Yeni Talep",
        tarihD: new Date(),
        kod: user.kod ?? "",
        soz: 0,
        tid: talepId,
      }
    );

    await executeConn(
      conn,
      `INSERT INTO DESTEK_DETAY (DESTEK_REF, MESAJ, MESAJ_TARIHI, KAYIT_EDEN)
       VALUES (@ref, @mesaj, @tarih, @kim)`,
      { ref: talepId, mesaj: data.aciklama, tarih, kim: user.id }
    );

    return talepId;
  });
}

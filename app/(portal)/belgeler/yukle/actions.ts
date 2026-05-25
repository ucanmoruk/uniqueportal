"use server";

import { requireAdmin } from "@/lib/auth";
import { query, queryOne, getPool, sql } from "@/lib/db";
import {
  sendEmail,
  digestTemplate,
  type DigestItem,
} from "@/lib/email";

export type UploadItemInput = {
  fileName: string;
  fileSize: number;
  firmaId: number | null;
  talepNo: number | null;
  tur: string;
  numuneAdi: string;
};

export type UploadState = {
  ok?: boolean;
  count?: number;
  error?: string;
  message?: string;
  /** Kaydedilen rapor ID'leri (bildirim gönderimi için) */
  raporIds?: number[];
  /** Etkilenen firma sayısı */
  firmaCount?: number;
};

/**
 * Belgeleri Rapor tablosuna kaydeder (storage entegrasyonu henüz yok —
 * Yol alanı pending placeholder ile yazılır, gerçek dosya bağlandığında
 * güncellenir).
 */
export async function uploadBelgelerAction(
  _prev: UploadState,
  items: UploadItemInput[]
): Promise<UploadState> {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  if (!items?.length) {
    return { error: "Yüklenecek dosya yok." };
  }

  // Doğrulamalar
  const errors: string[] = [];
  items.forEach((it, idx) => {
    if (!it.firmaId) errors.push(`#${idx + 1} ${it.fileName}: Firma seçilmedi.`);
    if (!it.tur || !it.tur.trim())
      errors.push(`#${idx + 1} ${it.fileName}: Tür boş.`);
  });

  if (errors.length) {
    return { error: errors.slice(0, 5).join(" | ") };
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  const raporIds: number[] = [];
  const firmaSet = new Set<number>();

  try {
    // RaporNo başlangıcı: tablodaki son + 1
    const last = await new sql.Request(tx).query<{ RaporNo: number | null }>(
      `SELECT TOP 1 RaporNo FROM Rapor ORDER BY ID DESC`
    );
    let nextNo = Number(last.recordset?.[0]?.RaporNo ?? 0) + 1;

    for (const it of items) {
      if (!it.firmaId) continue;
      firmaSet.add(it.firmaId);

      // Firma adını al (Rapor.FirmaAd alanına yazılacak)
      const firma = await new sql.Request(tx)
        .input("id", sql.Int, it.firmaId)
        .query<{ Firma_Adi: string | null }>(
          `SELECT Firma_Adi FROM Firma WHERE ID = @id`
        );
      const firmaAd = firma.recordset?.[0]?.Firma_Adi ?? null;

      const ins = await new sql.Request(tx)
        .input("raporNo", sql.Int, nextNo)
        .input("firmaAd", sql.NVarChar(sql.MAX), firmaAd)
        .input("numuneTur", sql.NVarChar(25), it.tur)
        .input("numuneAd", sql.NVarChar(150), it.numuneAdi ?? null)
        .input("tarih", sql.Date, new Date())
        .input("yol", sql.NVarChar(100), `pending:${it.fileName}`)
        .input("talepNo", sql.Int, it.talepNo ?? null)
        .input("firmaId", sql.Int, it.firmaId)
        .input("durum", sql.NVarChar(5), "Aktif")
        .input("raporId", sql.NVarChar(25), `R-${nextNo}`)
        .input("yukleyenId", sql.Int, user.id)
        .query<{ ID: number }>(
          `INSERT INTO Rapor (RaporNo, FirmaAd, NumuneTur, NumuneAd, Tarih,
                              Yol, TalepNo, FirmaID, Durum, RaporID, YukleyenID)
           OUTPUT INSERTED.ID
           VALUES (@raporNo, @firmaAd, @numuneTur, @numuneAd, @tarih,
                   @yol, @talepNo, @firmaId, @durum, @raporId, @yukleyenId)`
        );
      raporIds.push(ins.recordset[0].ID);
      nextNo++;
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    console.error("[uploadBelgeler] hata:", err);
    return { error: "Kayıt sırasında hata: " + (err as Error).message };
  }

  return {
    ok: true,
    count: raporIds.length,
    firmaCount: firmaSet.size,
    raporIds,
    message: `${raporIds.length} belge kaydedildi.`,
  };
}

// -------------------------------------------------------------------------
// Mail bildirimi — admin "Evet, mail gönder" dediğinde tetiklenir
// -------------------------------------------------------------------------

export type NotifyState = {
  ok?: boolean;
  sent?: number;
  skipped?: number;
  error?: string;
};

/**
 * Verilen Rapor ID'leri için firma bazında digest mail gönderir.
 * Her firmaya tek bir mail (digest), 30 rapor → 1 mail.
 */
export async function notifyRaporlarAction(
  raporIds: number[]
): Promise<NotifyState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkisiz işlem." };
  }

  if (!raporIds?.length) {
    return { error: "Bildirim atılacak rapor yok." };
  }

  // İlgili raporlar + firma bilgisi
  const placeholders = raporIds.map((_, i) => `@id${i}`).join(",");
  const params: Record<string, number> = {};
  raporIds.forEach((id, i) => (params[`id${i}`] = id));

  const rows = await query<{
    ID: number;
    RaporID: string | null;
    RaporNo: number | null;
    NumuneAd: string | null;
    FirmaID: number | null;
    Firma_Adi: string | null;
    Mail: string | null;
  }>(
    `SELECT r.ID, r.RaporID, r.RaporNo, r.NumuneAd, r.FirmaID,
            f.Firma_Adi, f.Mail
     FROM Rapor r
     LEFT JOIN Firma f ON f.ID = r.FirmaID
     WHERE r.ID IN (${placeholders})`,
    params
  );

  // Firma bazında grupla
  const buckets = new Map<
    number,
    {
      firmaAdi: string;
      mail: string;
      items: DigestItem[];
    }
  >();

  for (const r of rows) {
    if (!r.FirmaID || !r.Mail || r.Mail.length < 3) continue;
    let b = buckets.get(r.FirmaID);
    if (!b) {
      b = {
        firmaAdi: r.Firma_Adi ?? "Müşterimiz",
        mail: r.Mail,
        items: [],
      };
      buckets.set(r.FirmaID, b);
    }
    b.items.push({
      type: "rapor",
      baslik: r.NumuneAd ?? r.RaporID ?? `Rapor #${r.ID}`,
      altBaslik: r.RaporID ?? `R-${r.RaporNo ?? r.ID}`,
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [, b] of buckets) {
    const tpl = digestTemplate({
      firmaAdi: b.firmaAdi,
      raporlar: b.items,
      teklifler: [],
      faturalar: [],
      destekYanitlari: [],
    });
    if (!tpl) {
      skipped++;
      continue;
    }
    const res = await sendEmail({
      to: b.mail,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (res.sent) sent++;
    else {
      skipped++;
      errors.push(`${b.mail}: ${res.reason}`);
    }
  }

  return {
    ok: true,
    sent,
    skipped,
    error: errors.length ? errors.slice(0, 3).join(" | ") : undefined,
  };
}

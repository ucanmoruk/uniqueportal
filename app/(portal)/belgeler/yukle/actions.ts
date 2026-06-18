"use server";

import { requireAdmin } from "@/lib/auth";
import {
  query,
  withTransaction,
  insertAndGetId,
  queryOneConn,
  executeConn,
} from "@/lib/db-mysql";
import {
  sendEmail,
  digestTemplate,
  type DigestItem,
} from "@/lib/email";
import { userMessage } from "@/lib/errors";

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
  raporIds?: number[];
  firmaCount?: number;
};

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

  const errors: string[] = [];
  items.forEach((it, idx) => {
    if (!it.firmaId) errors.push(`#${idx + 1} ${it.fileName}: Firma seçilmedi.`);
    if (!it.tur || !it.tur.trim())
      errors.push(`#${idx + 1} ${it.fileName}: Tür boş.`);
  });

  if (errors.length) {
    return { error: errors.slice(0, 5).join(" | ") };
  }

  const raporIds: number[] = [];
  const firmaSet = new Set<number>();

  try {
    await withTransaction(async (conn) => {
      const last = await queryOneConn<{ RaporNo: number | null }>(
        conn,
        `SELECT RaporNo FROM Rapor ORDER BY ID DESC LIMIT 1`
      );
      let nextNo = Number(last?.RaporNo ?? 0) + 1;

      for (const it of items) {
        if (!it.firmaId) continue;
        firmaSet.add(it.firmaId);

        const firma = await queryOneConn<{ Firma_Adi: string | null }>(
          conn,
          `SELECT Firma_Adi FROM Firma WHERE ID = @id`,
          { id: it.firmaId }
        );
        const firmaAd = firma?.Firma_Adi ?? null;

        const id = await insertAndGetId(
          conn,
          `INSERT INTO Rapor (RaporNo, FirmaAd, NumuneTur, NumuneAd, Tarih,
                              Yol, TalepNo, FirmaID, Durum, RaporID, YukleyenID)
           VALUES (@raporNo, @firmaAd, @numuneTur, @numuneAd, @tarih,
                   @yol, @talepNo, @firmaId, @durum, @raporId, @yukleyenId)`,
          {
            raporNo: nextNo,
            firmaAd: firmaAd,
            numuneTur: it.tur,
            numuneAd: it.numuneAdi ?? null,
            tarih: new Date(),
            yol: `pending:${it.fileName}`,
            talepNo: it.talepNo ?? null,
            firmaId: it.firmaId,
            durum: "Aktif",
            raporId: `R-${nextNo}`,
            yukleyenId: user.id,
          }
        );
        raporIds.push(id);
        nextNo++;
      }
    });
  } catch (err) {
    return { error: userMessage(err, "Belgeler kaydedilemedi. Lütfen tekrar deneyin.") };
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

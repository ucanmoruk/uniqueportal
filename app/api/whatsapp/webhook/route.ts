/**
 * Twilio WhatsApp inbound webhook.
 *
 * Twilio Console → WhatsApp Sender → Inbound URL:
 *   https://<vercel-domain>/api/whatsapp/webhook
 *
 * İş akışı:
 *   1. Twilio POST eder (form-urlencoded): From, To, Body, MessageSid...
 *   2. Telefon → Firma eşleştir
 *   3. Eşleşme yoksa: kibarca "kayıtlı değilsiniz" yanıtla
 *   4. Eşleşme varsa:
 *        - Açık DESTEK ticket'ı var mı? (son 24 saatte aynı firmadan)
 *        - Varsa onun DESTEK_DETAY'ına ekle
 *        - Yoksa yeni DESTEK kaydı oluştur (BASLIK = mesajın ilk 80 karakteri)
 *   5. Otomatik yanıt: "Mesajınız alındı, ekibimiz bakacak."
 */

import { NextResponse } from "next/server";
import { getPool, queryOne, sql } from "@/lib/db";
import { findFirmaByPhone } from "@/lib/repositories/firma-phone";
import { sendText, fromWhatsAppAddress } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TwilioInbound {
  From: string;       // "whatsapp:+90..."
  To: string;
  Body: string;
  MessageSid: string;
  ProfileName?: string;
}

async function parseInbound(req: Request): Promise<TwilioInbound | null> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    return {
      From: params.get("From") ?? "",
      To: params.get("To") ?? "",
      Body: params.get("Body") ?? "",
      MessageSid: params.get("MessageSid") ?? "",
      ProfileName: params.get("ProfileName") ?? undefined,
    };
  }
  if (ct.includes("application/json")) {
    const j = await req.json();
    return j as TwilioInbound;
  }
  return null;
}

export async function POST(req: Request) {
  // Twilio basit X-Twilio-Signature ile doğrulanabilir; şimdilik secret ile koruma
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const inbound = await parseInbound(req);
  if (!inbound || !inbound.From || !inbound.Body) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const phone = fromWhatsAppAddress(inbound.From);
  const firma = await findFirmaByPhone(phone);

  if (!firma) {
    // Kayıtlı olmayan numaraya bilgilendirme
    await sendText(
      inbound.From,
      "Merhaba, bu numara UNIQUE Analiz portalında kayıtlı görünmüyor. Kayıtlı olduğunuz cep numaranızdan yazmayı deneyebilir veya destek@uniqueanaliz.com ile iletişime geçebilirsiniz."
    );
    return NextResponse.json({ ok: true, matched: false });
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Açık ticket var mı? (son 24 saat içinde aynı firmadan WhatsApp gelmiş mi)
    const recent = await new sql.Request(tx)
      .input("kod", sql.NVarChar(10), firma.Kod ?? "")
      .query<{ ID: number; TalepID: number }>(
        `SELECT TOP 1 d.ID, d.TalepID
         FROM DESTEK d
         WHERE d.FirmaKodu = @kod
           AND d.Durum NOT IN ('Pasif', 'Kapalı', 'Tamamlandı')
           AND d.TUR = 'WA'
           AND d.Tarih >= CAST(DATEADD(HOUR, -48, GETDATE()) AS DATE)
         ORDER BY d.ID DESC`
      );

    let talepId: number;

    if (recent.recordset.length > 0) {
      // Mevcut ticket'a ekle
      talepId = recent.recordset[0].TalepID;
    } else {
      // Yeni DESTEK + Talep oluştur
      const last = await new sql.Request(tx).query<{ TalepNo: number | null }>(
        `SELECT TOP 1 TalepNo FROM Talep ORDER BY ID DESC`
      );
      const yeniNo = Number(last.recordset?.[0]?.TalepNo ?? 0) + 1;

      const ins = await new sql.Request(tx)
        .input("tarih", sql.Date, new Date())
        .input("kod", sql.NVarChar(10), firma.Kod ?? "")
        .input("sozlesme", sql.Int, 0)
        .input("durum", sql.NVarChar(20), "Yeni Talep")
        .input("talepNo", sql.Int, yeniNo)
        .input("yetkili", sql.Int, 0)
        .input("tur", sql.NVarChar(6), "Destek")
        .input("olusturan", sql.Int, firma.ID)
        .query<{ ID: number }>(
          `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, Yetkili, Tur, Olusturan)
           OUTPUT INSERTED.ID
           VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @yetkili, @tur, @olusturan)`
        );
      talepId = ins.recordset[0].ID;

      // DESTEK header (TUR = "WA" → WhatsApp kanalı)
      await new sql.Request(tx)
        .input("no", sql.VarChar(100), `WA${yeniNo}`)
        .input("tur", sql.NVarChar(6), "WA")
        .input("konu", sql.TinyInt, 1)
        .input("baslik", sql.VarChar(255), inbound.Body.slice(0, 80))
        .input("aciklama", sql.Text, inbound.Body)
        .input("kt", sql.VarChar(50), tarih)
        .input("kim", sql.Int, firma.ID)
        .input("durum", sql.NVarChar(20), "Yeni Talep")
        .input("tarihD", sql.Date, new Date())
        .input("kod", sql.NVarChar(10), firma.Kod ?? "")
        .input("soz", sql.Int, 0)
        .input("tid", sql.Int, talepId)
        .query(
          `INSERT INTO DESTEK
           (DESTEK_NO, TUR, KONU_TUR, BASLIK, ACIKLAMA, KAYIT_TARIHI, KAYIT_EDEN,
            Durum, Tarih, FirmaKodu, Sozlesme, TalepID)
           VALUES (@no, @tur, @konu, @baslik, @aciklama, @kt, @kim, @durum, @tarihD, @kod, @soz, @tid)`
        );
    }

    // Mesajı DESTEK_DETAY'a ekle
    await new sql.Request(tx)
      .input("ref", sql.Int, talepId)
      .input("mesaj", sql.Text, inbound.Body)
      .input("tarih", sql.VarChar(50), tarih)
      .input("kim", sql.Int, firma.ID)
      .query(
        `INSERT INTO DESTEK_DETAY (DESTEK_REF, MESAJ, MESAJ_TARIHI, KAYIT_EDEN)
         VALUES (@ref, @mesaj, @tarih, @kim)`
      );

    // Talep durumunu "Müşteri Yanıtı" yap
    await new sql.Request(tx)
      .input("tid", sql.Int, talepId)
      .input("durum", sql.NVarChar(20), "Müşteri Yanıtı")
      .query(`UPDATE Talep SET Durum = @durum WHERE ID = @tid`);

    await tx.commit();

    // Otomatik onay yanıtı
    const isNew = recent.recordset.length === 0;
    await sendText(
      inbound.From,
      isNew
        ? `Merhaba ${firma.Firma_Adi ?? ""}, mesajınız alındı ✓ Destek talebiniz açıldı. Ekibimiz en kısa sürede dönecek.`
        : `Mesajınız mevcut destek talebinize eklendi ✓`
    );

    return NextResponse.json({ ok: true, matched: true, talepId, isNew });
  } catch (err) {
    await tx.rollback();
    console.error("[whatsapp/webhook] hata:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// GET — health check / Twilio verification
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

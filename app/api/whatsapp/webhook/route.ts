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
 *        - Açık DESTEK ticket'ı var mı? (son 48 saatte aynı firmadan)
 *        - Varsa onun DESTEK_DETAY'ına ekle
 *        - Yoksa yeni DESTEK kaydı oluştur (BASLIK = mesajın ilk 80 karakteri)
 *   5. Otomatik yanıt: "Mesajınız alındı, ekibimiz bakacak."
 */

import { NextResponse } from "next/server";
import {
  withTransaction,
  insertAndGetId,
  queryOneConn,
  executeConn,
} from "@/lib/db-mysql";
import { findFirmaByPhone } from "@/lib/repositories/firma-phone";
import {
  sendText,
  fromWhatsAppAddress,
  verifyTwilioSignature,
} from "@/lib/whatsapp";
import { generateDestekNo } from "@/lib/repositories/destek";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TwilioInbound {
  From: string;       // "whatsapp:+90..."
  To: string;
  Body: string;
  MessageSid: string;
  ProfileName?: string;
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  let allParams: Record<string, string> = {};
  let inbound: TwilioInbound | null = null;

  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    allParams = Object.fromEntries(params.entries());
    inbound = {
      From: params.get("From") ?? "",
      To: params.get("To") ?? "",
      Body: params.get("Body") ?? "",
      MessageSid: params.get("MessageSid") ?? "",
      ProfileName: params.get("ProfileName") ?? undefined,
    };
  } else if (ct.includes("application/json")) {
    inbound = (await req.json()) as TwilioInbound;
  }

  // --- Doğrulama katmanı ---
  const sigResult = verifyTwilioSignature(
    req.url,
    allParams,
    req.headers.get("x-twilio-signature")
  );
  if (sigResult === false) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (sigResult === null) {
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (secret) {
      const url = new URL(req.url);
      if (url.searchParams.get("secret") !== secret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
  }

  if (!inbound || !inbound.From || !inbound.Body) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const phone = fromWhatsAppAddress(inbound.From);
  const firma = await findFirmaByPhone(phone);

  if (!firma) {
    await sendText(
      inbound.From,
      "Merhaba, bu numara UNIQUE Analiz portalında kayıtlı görünmüyor. Kayıtlı olduğunuz cep numaranızdan yazmayı deneyebilir veya destek@uniqueanaliz.com ile iletişime geçebilirsiniz."
    );
    return NextResponse.json({ ok: true, matched: false });
  }

  try {
    let talepId: number;
    let isNew = false;

    await withTransaction(async (conn) => {
      const tarih = new Date().toISOString().slice(0, 19).replace("T", " ");

      const recent = await queryOneConn<{ ID: number; TalepID: number }>(
        conn,
        `SELECT d.ID, d.TalepID
         FROM DESTEK d
         WHERE d.FirmaKodu = @kod
           AND d.Durum NOT IN ('Pasif', 'Kapalı', 'Tamamlandı')
           AND d.TUR = 'WA'
           AND d.Tarih >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
         ORDER BY d.ID DESC
         LIMIT 1`,
        { kod: firma.Kod ?? "" }
      );

      if (recent) {
        talepId = recent.TalepID;
        isNew = false;
      } else {
        isNew = true;
        const last = await queryOneConn<{ TalepNo: number | null }>(
          conn,
          `SELECT TalepNo FROM Talep ORDER BY ID DESC LIMIT 1`
        );
        const yeniNo = Number(last?.TalepNo ?? 0) + 1;

        talepId = await insertAndGetId(
          conn,
          `INSERT INTO Talep (Tarih, FirmaKodu, Sozlesme, Durum, TalepNo, Yetkili, Tur, Olusturan)
           VALUES (@tarih, @kod, @sozlesme, @durum, @talepNo, @yetkili, @tur, @olusturan)`,
          {
            tarih: new Date(),
            kod: firma.Kod ?? "",
            sozlesme: 0,
            durum: "Yeni Talep",
            talepNo: yeniNo,
            yetkili: 0,
            tur: "Destek",
            olusturan: firma.ID,
          }
        );

        const destekNo = await generateDestekNo(conn, firma.Kod ?? "");
        await executeConn(
          conn,
          `INSERT INTO DESTEK
           (DESTEK_NO, TUR, KONU_TUR, BASLIK, ACIKLAMA, KAYIT_TARIHI, KAYIT_EDEN,
            Durum, Tarih, FirmaKodu, Sozlesme, TalepID)
           VALUES (@no, @tur, @konu, @baslik, @aciklama, @kt, @kim, @durum, @tarihD, @kod, @soz, @tid)`,
          {
            no: destekNo,
            tur: "WA",
            konu: 1,
            baslik: inbound!.Body.slice(0, 80),
            aciklama: inbound!.Body,
            kt: tarih,
            kim: firma.ID,
            durum: "Yeni Talep",
            tarihD: new Date(),
            kod: firma.Kod ?? "",
            soz: 0,
            tid: talepId,
          }
        );
      }

      await executeConn(
        conn,
        `INSERT INTO DESTEK_DETAY (DESTEK_REF, MESAJ, MESAJ_TARIHI, KAYIT_EDEN)
         VALUES (@ref, @mesaj, @tarih, @kim)`,
        { ref: talepId, mesaj: inbound!.Body, tarih, kim: firma.ID }
      );

      await executeConn(
        conn,
        `UPDATE Talep SET Durum = @durum WHERE ID = @tid`,
        { tid: talepId, durum: "Müşteri Yanıtı" }
      );
    });

    await sendText(
      inbound.From,
      isNew
        ? `Merhaba ${firma.Firma_Adi ?? ""}, mesajınız alındı ✓ Destek talebiniz açıldı. Ekibimiz en kısa sürede dönecek.`
        : `Mesajınız mevcut destek talebinize eklendi ✓`
    );

    return NextResponse.json({ ok: true, matched: true, talepId: talepId!, isNew });
  } catch (err) {
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

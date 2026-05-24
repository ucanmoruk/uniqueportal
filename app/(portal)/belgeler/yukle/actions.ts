"use server";

import { requireAdmin } from "@/lib/auth";

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
};

/**
 * Şu an sadece doğrulama + özet döner. Storage entegrasyonu (Vercel Blob /
 * PHP sunucu / R2) bağlandığında bu action gerçek upload + Rapor insert
 * yapacak.
 */
export async function uploadBelgelerAction(
  _prev: UploadState,
  items: UploadItemInput[]
): Promise<UploadState> {
  try {
    await requireAdmin();
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

  // TODO: storage entegrasyonu olduğunda:
  // 1) Dosyaları Vercel Blob / R2 / PHP sunucu adresine yükle
  // 2) Her dosya için Rapor tablosuna kayıt ekle (RaporNo + 1 logic)
  // 3) revalidatePath("/belgeler")
  // Şimdilik sadece sayım dön.

  return {
    ok: true,
    count: items.length,
    message: `${items.length} dosya doğrulandı. Storage entegre olduğunda otomatik yüklenecek.`,
  };
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createDestekTalep } from "@/lib/repositories/destek";
import { z } from "zod";

const RelatedSchema = z
  .object({
    type: z.enum(["Teklif", "Rapor", "Fatura"]),
    id: z.coerce.number().int().positive(),
    label: z.string().min(1).max(100),
  })
  .nullable();

const Schema = z.object({
  baslik: z
    .string()
    .min(3, "Başlık en az 3 karakter olmalı.")
    .max(255, "Başlık 255 karakteri geçemez."),
  aciklama: z.string().min(5, "Açıklama en az 5 karakter olmalı.").max(5000),
  ilgili: RelatedSchema.optional(),
});

export interface YeniDestekState {
  error?: string;
}

export async function yeniDestekAction(
  _prev: YeniDestekState,
  formData: FormData
): Promise<YeniDestekState> {
  const user = await requireUser();

  const ilgiliRaw = formData.get("ilgili")?.toString();
  let ilgili: { type: "Teklif" | "Rapor" | "Fatura"; id: number; label: string } | null = null;
  if (ilgiliRaw) {
    try {
      const parsed = RelatedSchema.parse(JSON.parse(ilgiliRaw));
      ilgili = parsed;
    } catch {
      return { error: "İlgili kayıt formatı hatalı." };
    }
  }

  const payload = {
    baslik: formData.get("baslik")?.toString() ?? "",
    aciklama: formData.get("aciklama")?.toString() ?? "",
    ilgili,
  };
  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." };
  }

  try {
    const id = await createDestekTalep(user, parsed.data);
    revalidatePath("/destek");
    redirect(`/destek/${id}`);
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[yeniDestek] hata:", err);
    return { error: "Talep oluşturulamadı: " + (err as Error).message };
  }
}

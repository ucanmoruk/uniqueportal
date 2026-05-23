"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createDestekTalep } from "@/lib/repositories/destek";
import { z } from "zod";

const Schema = z.object({
  baslik: z
    .string()
    .min(3, "Başlık en az 3 karakter olmalı.")
    .max(255, "Başlık 255 karakteri geçemez."),
  aciklama: z.string().min(5, "Açıklama en az 5 karakter olmalı.").max(5000),
});

export interface YeniDestekState {
  error?: string;
}

export async function yeniDestekAction(
  _prev: YeniDestekState,
  formData: FormData
): Promise<YeniDestekState> {
  const user = await requireUser();
  const payload = {
    baslik: formData.get("baslik")?.toString() ?? "",
    aciklama: formData.get("aciklama")?.toString() ?? "",
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

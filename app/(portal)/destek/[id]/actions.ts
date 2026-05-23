"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addDestekMesaj } from "@/lib/repositories/destek";

export interface MesajState {
  error?: string;
  ok?: boolean;
}

export async function gonderMesajAction(
  _prev: MesajState,
  formData: FormData
): Promise<MesajState> {
  const user = await requireUser();
  const talepId = Number(formData.get("talepId"));
  const mesaj = formData.get("mesaj")?.toString().trim() ?? "";

  if (!Number.isInteger(talepId)) {
    return { error: "Geçersiz talep." };
  }
  if (mesaj.length === 0) {
    return { error: "Mesaj boş olamaz." };
  }
  if (mesaj.length > 5000) {
    return { error: "Mesaj 5000 karakteri geçemez." };
  }

  try {
    await addDestekMesaj(user, talepId, mesaj);
    revalidatePath(`/destek/${talepId}`);
    revalidatePath("/destek");
    return { ok: true };
  } catch (err) {
    console.error("[gonderMesaj] hata:", err);
    return { error: (err as Error).message };
  }
}

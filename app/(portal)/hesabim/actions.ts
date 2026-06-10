"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  findFirmaById,
  updateFirma,
  updateFirmaParola,
} from "@/lib/repositories/firma";
import { userMessage } from "@/lib/errors";

const ProfilSchema = z.object({
  Firma_Adi: z.string().min(1, "Firma adı zorunlu."),
  Adres: z.string().max(2000).default(""),
  Vergi_Dairesi: z.string().max(50).default(""),
  Vergi_No: z.string().max(15).default(""),
  Telefon: z.string().max(20).default(""),
  Mail: z.string().email("Geçerli e-posta giriniz.").or(z.literal("")).default(""),
});

export interface ProfilState {
  error?: string;
  ok?: boolean;
}

export async function updateProfilAction(
  _prev: ProfilState,
  formData: FormData
): Promise<ProfilState> {
  const user = await requireUser();
  const payload = {
    Firma_Adi: formData.get("Firma_Adi")?.toString() ?? "",
    Adres: formData.get("Adres")?.toString() ?? "",
    Vergi_Dairesi: formData.get("Vergi_Dairesi")?.toString() ?? "",
    Vergi_No: formData.get("Vergi_No")?.toString() ?? "",
    Telefon: formData.get("Telefon")?.toString() ?? "",
    Mail: formData.get("Mail")?.toString() ?? "",
  };

  const parsed = ProfilSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." };
  }

  try {
    await updateFirma(user.id, parsed.data);
    revalidatePath("/hesabim");
    return { ok: true };
  } catch (err) {
    return { error: userMessage(err, "Profil güncellenemedi. Lütfen tekrar deneyin.") };
  }
}

const ParolaSchema = z
  .object({
    mevcut: z.string().min(1, "Mevcut parola zorunlu."),
    yeni: z.string().min(4, "Yeni parola en az 4 karakter olmalı.").max(15, "Parola 15 karakteri geçemez."),
    yeniTekrar: z.string(),
  })
  .refine((d) => d.yeni === d.yeniTekrar, {
    message: "Yeni parolalar eşleşmiyor.",
    path: ["yeniTekrar"],
  });

export interface ParolaState {
  error?: string;
  ok?: boolean;
}

export async function updateParolaAction(
  _prev: ParolaState,
  formData: FormData
): Promise<ParolaState> {
  const user = await requireUser();
  const payload = {
    mevcut: formData.get("mevcut")?.toString().trim() ?? "",
    yeni: formData.get("yeni")?.toString().trim() ?? "",
    yeniTekrar: formData.get("yeniTekrar")?.toString().trim() ?? "",
  };
  const parsed = ParolaSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Form hatalı." };
  }

  const firma = await findFirmaById(user.id);
  if (!firma) return { error: "Firma bulunamadı." };

  if ((firma.Parola ?? "").trim() !== parsed.data.mevcut) {
    return { error: "Mevcut parolanız hatalı." };
  }

  try {
    await updateFirmaParola(user.id, parsed.data.yeni);
    return { ok: true };
  } catch (err) {
    return { error: userMessage(err, "Parola güncellenemedi. Lütfen tekrar deneyin.") };
  }
}

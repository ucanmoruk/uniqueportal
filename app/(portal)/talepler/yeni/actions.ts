"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createTalep } from "@/lib/repositories/talep";
import { userMessage } from "@/lib/errors";

const NumuneSchema = z.object({
  Numune: z.string().max(250).default(""),
  Ozellik: z.string().max(250).default(""),
  Analiz: z.string().max(250).default(""),
  Metot: z.string().max(250).default(""),
});

const Schema = z.object({
  raporlama: z.object({
    Firma: z.string().min(1, "Firma adı zorunlu.").max(500),
    Adres: z.string().max(2000).default(""),
    Yetkili: z.string().max(150).default(""),
    Iletisim: z.string().max(150).default(""),
    Karar: z.enum(["Belirsizlik dahil edilmesin", "Belirsizlik pozitif yönde dahil edilsin", "Belirsizlik negatif yönde dahil edilsin"]).default("Belirsizlik dahil edilmesin"),
    Dil: z.enum(["Türkçe", "İngilizce", "Türkçe ve İngilizce"]).default("Türkçe"),
    Iade: z.enum(["Evet", "Hayır"]).default("Hayır"),
    UreticiFirma: z.string().max(500).default(""),
    Note: z.string().max(2000).default(""),
  }),
  fatura: z.object({
    Firma: z.string().max(500).default(""),
    Adres: z.string().max(2000).default(""),
    VergiDairesi: z.string().max(50).default(""),
    VergiNo: z.string().max(15).default(""),
    Mail: z.string().email("Geçerli e-posta giriniz.").or(z.literal("")).default(""),
  }),
  numuneler: z.array(NumuneSchema).min(1, "En az bir numune ekleyin."),
  sozlesme: z.boolean(),
});

export type YeniTalepState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseNumuneler(formData: FormData) {
  const result: Array<{ Numune: string; Ozellik: string; Analiz: string; Metot: string }> = [];
  // form alanları: numuneler[0][Numune], numuneler[0][Ozellik] vs.
  const buckets = new Map<number, { Numune: string; Ozellik: string; Analiz: string; Metot: string }>();
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^numuneler\[(\d+)\]\[(Numune|Ozellik|Analiz|Metot)\]$/);
    if (!m) continue;
    const idx = Number(m[1]);
    const field = m[2] as "Numune" | "Ozellik" | "Analiz" | "Metot";
    if (!buckets.has(idx)) {
      buckets.set(idx, { Numune: "", Ozellik: "", Analiz: "", Metot: "" });
    }
    buckets.get(idx)![field] = String(value);
  }
  for (const idx of [...buckets.keys()].sort((a, b) => a - b)) {
    result.push(buckets.get(idx)!);
  }
  return result;
}

export async function yeniTalepAction(
  _prev: YeniTalepState,
  formData: FormData
): Promise<YeniTalepState> {
  const user = await requireUser();

  const numuneler = parseNumuneler(formData).filter(
    (n) => n.Numune || n.Ozellik || n.Analiz || n.Metot
  );

  const payload = {
    raporlama: {
      Firma: formData.get("raporlama_Firma")?.toString() ?? "",
      Adres: formData.get("raporlama_Adres")?.toString() ?? "",
      Yetkili: formData.get("raporlama_Yetkili")?.toString() ?? "",
      Iletisim: formData.get("raporlama_Iletisim")?.toString() ?? "",
      Karar: formData.get("raporlama_Karar")?.toString() ?? "Belirsizlik dahil edilmesin",
      Dil: formData.get("raporlama_Dil")?.toString() ?? "Türkçe",
      Iade: formData.get("raporlama_Iade")?.toString() ?? "Hayır",
      UreticiFirma: formData.get("raporlama_UreticiFirma")?.toString() ?? "",
      Note: formData.get("raporlama_Note")?.toString() ?? "",
    },
    fatura: {
      Firma: formData.get("fatura_Firma")?.toString() ?? "",
      Adres: formData.get("fatura_Adres")?.toString() ?? "",
      VergiDairesi: formData.get("fatura_VergiDairesi")?.toString() ?? "",
      VergiNo: formData.get("fatura_VergiNo")?.toString() ?? "",
      Mail: formData.get("fatura_Mail")?.toString() ?? "",
    },
    numuneler,
    sozlesme: formData.get("sozlesme") === "on",
  };

  const parsed = Schema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Form hatalı. Lütfen alanları kontrol edin.", fieldErrors };
  }

  if (!parsed.data.sozlesme) {
    return { error: "Sözleşmeyi onaylamadan talep oluşturulamaz." };
  }

  try {
    const id = await createTalep({
      ...parsed.data,
      sozlesme: parsed.data.sozlesme ? 1 : 0,
      user,
    });
    revalidatePath("/talepler");
    revalidatePath("/ozet");
    redirect(`/talepler/${id}`);
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    return { error: userMessage(err, "Talep kaydedilemedi. Lütfen tekrar deneyin.") };
  }
}

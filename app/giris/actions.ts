"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { findFirmaByKod } from "@/lib/repositories/firma";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const kod = formData.get("kod")?.toString().trim() ?? "";
  const parola = formData.get("parola")?.toString().trim() ?? "";
  const next = formData.get("next")?.toString() || "/ozet";

  if (!kod || !parola) {
    return { error: "Kullanıcı kodu ve parola zorunludur." };
  }

  try {
    await signIn("credentials", { kod, parola, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      // Dev modunda hangi adımda başarısız olduğunu söyle.
      if (process.env.NODE_ENV !== "production") {
        const firma = await findFirmaByKod(kod);
        if (!firma) {
          return {
            error: `Kullanıcı kodu "${kod}" sistemde bulunamadı. (UQ12345 formatında olmalı)`,
          };
        }
        return {
          error:
            "Parola yanlış. (Mevcut sistemdeki parolanızın aynısını kullanın — genellikle 6 karakter.)",
        };
      }
      return { error: "Kullanıcı kodu veya parola hatalı." };
    }
    console.error("[loginAction] beklenmeyen hata:", err);
    return { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }

  redirect(next);
}

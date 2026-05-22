"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const kod = formData.get("kod")?.toString().trim() ?? "";
  const parola = formData.get("parola")?.toString() ?? "";
  const next = formData.get("next")?.toString() || "/ozet";

  if (!kod || !parola) {
    return { error: "Kullanıcı kodu ve parola zorunludur." };
  }

  try {
    await signIn("credentials", {
      kod,
      parola,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Kullanıcı kodu veya parola hatalı." };
    }
    return { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }

  redirect(next);
}

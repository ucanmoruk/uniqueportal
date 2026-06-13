"use server";

import { headers } from "next/headers";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { findFirmaByMail } from "@/lib/repositories/firma";
import { hit, reset, clientIpFromHeaders } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const mail = formData.get("mail")?.toString().trim().toLowerCase() ?? "";
  const parola = formData.get("parola")?.toString().trim() ?? "";
  const next = formData.get("next")?.toString() || "/ozet";

  if (!mail || !parola) {
    return { error: "E-posta adresi ve parola zorunludur." };
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/ozet";

  const ip = clientIpFromHeaders(await headers());
  const rl = hit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.ok) {
    return {
      error: `Çok fazla başarısız deneme. Lütfen ${rl.retryAfterSec} saniye sonra tekrar deneyin.`,
    };
  }

  try {
    await signIn("credentials", { mail, parola, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      if (process.env.NODE_ENV !== "production") {
        const firma = await findFirmaByMail(mail);
        if (!firma) {
          return {
            error: `"${mail}" adresi ile kayıtlı bir firma bulunamadı.`,
          };
        }
        return {
          error:
            "Parola yanlış. (Mevcut sistemdeki parolanızın aynısını kullanın.)",
        };
      }
      return { error: "E-posta adresi veya parola hatalı." };
    }
    console.error("[loginAction] beklenmeyen hata:", err);
    return { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }

  reset(`login:${ip}`);
  redirect(safeNext);
}

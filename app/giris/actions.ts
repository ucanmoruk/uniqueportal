"use server";

import { headers } from "next/headers";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { findFirmaByKod } from "@/lib/repositories/firma";
import { hit, reset, clientIpFromHeaders } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

// Brute-force koruması: aynı IP'den 5 dakikada en fazla 8 başarısız deneme.
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

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

  // Yalnızca güvenli (path-traversal/absolute) olmayan dahili rotalara izin ver
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/ozet";

  // Rate limit — IP bazlı
  const ip = clientIpFromHeaders(await headers());
  const rl = hit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.ok) {
    return {
      error: `Çok fazla başarısız deneme. Lütfen ${rl.retryAfterSec} saniye sonra tekrar deneyin.`,
    };
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

  // Başarılı giriş → IP sayacını sıfırla
  reset(`login:${ip}`);
  redirect(safeNext);
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findFirmaByKod } from "@/lib/repositories/firma";
import { authConfig } from "@/lib/auth.config";

/**
 * Node.js runtime auth — Credentials provider MSSQL'e bağlanır.
 * Server actions, route handlers ve sayfaların kullandığı `auth()`,
 * `handlers`, `signIn`, `signOut` buradan export edilir.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        kod: { label: "Kullanıcı Kodu", type: "text" },
        parola: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        const kod = (credentials?.kod as string | undefined)?.trim();
        const parola = (credentials?.parola as string | undefined)?.trim();
        if (!kod || !parola) return null;

        const firma = await findFirmaByKod(kod);
        if (!firma) return null;

        const dbParola = (firma.Parola ?? "").trim();
        if (dbParola !== parola) return null;

        return {
          id: String(firma.ID),
          name: firma.Firma_Adi ?? firma.Kod ?? "",
          kod: firma.Kod ?? "",
          firmaAdi: firma.Firma_Adi ?? "",
          tur: firma.Tur ?? "Müşteri",
          yetkili: firma.Yetkili,
          plasiyerId: firma.PlasiyerID,
        };
      },
    }),
  ],
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Yetkisiz");
  }
  return {
    id: Number(session.user.id),
    kod: session.user.kod,
    firmaAdi: session.user.firmaAdi,
    tur: session.user.tur,
    yetkili: session.user.yetkili,
    plasiyerId: session.user.plasiyerId,
  };
}

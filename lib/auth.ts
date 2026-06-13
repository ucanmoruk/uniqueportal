import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findFirmaByMail } from "@/lib/repositories/firma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        mail: { label: "E-posta", type: "email" },
        parola: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        const mail = (credentials?.mail as string | undefined)?.trim();
        const parola = (credentials?.parola as string | undefined)?.trim();
        if (!mail || !parola) return null;

        const firma = await findFirmaByMail(mail);
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

export async function requireAdmin() {
  const user = await requireUser();
  if (user.tur !== "Admin") {
    throw new Error("Bu işlem için yönetici yetkisi gerekli.");
  }
  return user;
}

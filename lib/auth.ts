import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findFirmaByKod } from "@/lib/repositories/firma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      kod: string;
      firmaAdi: string;
      tur: string;
      yetkili: string | null;
      plasiyerId: number | null;
    } & DefaultSession["user"];
  }
}

interface AppJwt {
  uid: number;
  kod: string;
  firmaAdi: string;
  tur: string;
  yetkili: string | null;
  plasiyerId: number | null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/giris" },
  providers: [
    Credentials({
      credentials: {
        kod: { label: "Kullanıcı Kodu", type: "text" },
        parola: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        const kod = (credentials?.kod as string | undefined)?.trim();
        const parola = credentials?.parola as string | undefined;
        if (!kod || !parola) return null;

        const firma = await findFirmaByKod(kod);
        if (!firma) return null;
        if ((firma.Parola ?? "") !== parola) return null;

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
  callbacks: {
    async jwt({ token, user }) {
      const t = token as unknown as AppJwt & Record<string, unknown>;
      if (user) {
        const u = user as unknown as {
          id: string;
          kod: string;
          firmaAdi: string;
          tur: string;
          yetkili: string | null;
          plasiyerId: number | null;
        };
        t.uid = Number(u.id);
        t.kod = u.kod;
        t.firmaAdi = u.firmaAdi;
        t.tur = u.tur;
        t.yetkili = u.yetkili;
        t.plasiyerId = u.plasiyerId;
      }
      return t as unknown as typeof token;
    },
    async session({ session, token }) {
      const t = token as unknown as AppJwt;
      session.user.id = String(t.uid);
      session.user.kod = t.kod;
      session.user.firmaAdi = t.firmaAdi;
      session.user.tur = t.tur;
      session.user.yetkili = t.yetkili;
      session.user.plasiyerId = t.plasiyerId;
      return session;
    },
  },
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

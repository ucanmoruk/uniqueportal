import type { NextAuthConfig, DefaultSession } from "next-auth";

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

export interface AppJwt {
  uid: number;
  kod: string;
  firmaAdi: string;
  tur: string;
  yetkili: string | null;
  plasiyerId: number | null;
}

/**
 * Edge-safe auth config.
 *
 * Bu config Node.js'e özgü modüllere bağımlı DEĞİL — yani middleware/proxy
 * (Edge runtime) tarafından güvenli şekilde kullanılabilir. JWT okuma, session
 * doldurma, sayfa yönlendirmeleri burada. MSSQL ve Credentials provider gibi
 * Node-only kodlar `lib/auth.ts`'de.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/giris" },
  providers: [],
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
} satisfies NextAuthConfig;

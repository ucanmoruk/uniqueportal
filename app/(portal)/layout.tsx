import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut, requireUser } from "@/lib/auth";
import { SidebarShell } from "@/components/portal-shell/sidebar-nav";
import {
  getBildirimler,
  getSonGoruldu,
} from "@/lib/repositories/bildirim";
import { PasswordWarningBanner } from "@/components/password-warning-banner";

// Bildirimler her sayfa geçişinde fresh çekilsin — Next.js layout cache'i
// yüzünden eski payload gelmesin.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleSignOut() {
  "use server";
  await signOut({ redirect: false });
  redirect("/giris");
}

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  // Bildirimler — paralel çek, hata olursa boş dön
  const [bildirimler, sonGoruldu] = await Promise.all([
    getBildirimler(user, 30).catch(() => []),
    getSonGoruldu(user.id).catch(() => null),
  ]);

  return (
    <SidebarShell
      user={{
        firmaAdi: user.firmaAdi,
        kod: user.kod,
        tur: user.tur,
      }}
      signOutAction={handleSignOut}
      bildirimler={bildirimler.map((b) => ({
        ...b,
        tarih: b.tarih.toISOString(),
      }))}
      lastSeen={sonGoruldu ? sonGoruldu.toISOString() : null}
    >
      <PasswordWarningBanner />
      {children}
    </SidebarShell>
  );
}

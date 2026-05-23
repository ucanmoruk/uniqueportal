import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut, requireUser } from "@/lib/auth";
import { SidebarShell } from "@/components/portal-shell/sidebar-nav";

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

  return (
    <SidebarShell
      user={{
        firmaAdi: user.firmaAdi,
        kod: user.kod,
        tur: user.tur,
      }}
      signOutAction={handleSignOut}
    >
      {children}
    </SidebarShell>
  );
}

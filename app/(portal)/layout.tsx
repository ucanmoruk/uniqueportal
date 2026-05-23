import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut, requireUser } from "@/lib/auth";
import { SidebarNav } from "@/components/portal-shell/sidebar-nav";

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <SidebarNav
        user={{
          firmaAdi: user.firmaAdi,
          kod: user.kod,
          tur: user.tur,
        }}
        signOutAction={handleSignOut}
      />

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

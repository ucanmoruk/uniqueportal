import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/auth";
import { LogOut, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/ozet" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="size-4" />
            </span>
            <span>UNIQUE Portal</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { href: "/ozet", label: "Özet" },
              { href: "/talepler", label: "Talepler" },
              { href: "/teklifler", label: "Teklifler" },
              { href: "/faturalar", label: "Faturalar" },
              { href: "/termin", label: "Termin" },
              { href: "/belgeler", label: "Belgeler" },
              { href: "/destek", label: "Destek" },
              { href: "/hesabim", label: "Hesabım" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-xs leading-tight">
              <span className="font-medium">{user.firmaAdi}</span>
              <span className="text-muted-foreground">{user.kod}</span>
            </div>
            <form action={handleSignOut}>
              <Button variant="ghost" size="icon" type="submit" title="Çıkış">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

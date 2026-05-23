"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Receipt,
  Clock,
  FileCheck,
  LifeBuoy,
  User,
  FlaskConical,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { href: "/ozet", label: "Özet", icon: LayoutDashboard },
  { href: "/talepler", label: "Talepler", icon: FileText },
  { href: "/teklifler", label: "Teklifler", icon: FileSpreadsheet },
  { href: "/faturalar", label: "Faturalar", icon: Receipt },
  { href: "/termin", label: "Termin Takibi", icon: Clock },
  { href: "/belgeler", label: "Belgelerim", icon: FileCheck },
  { href: "/destek", label: "Destek", icon: LifeBuoy },
  { href: "/hesabim", label: "Hesabım", icon: User },
];

export function SidebarNav({
  user,
  signOutAction,
}: {
  user: { firmaAdi: string; kod: string; tur: string };
  signOutAction: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // mobile drawer kapansın navigation sonrası
  React.useEffect(() => setOpen(false), [pathname]);

  const initials = (user.firmaAdi || user.kod)
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navContent = (
    <>
      <div className="px-5 py-5 border-b">
        <Link href="/ozet" className="flex items-center gap-2.5 group">
          <span className="inline-flex items-center justify-center size-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <FlaskConical className="size-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">UNIQUE</span>
            <span className="text-[11px] text-muted-foreground">
              Services Portal
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md">
          <div className="inline-flex items-center justify-center size-9 rounded-full bg-accent text-accent-foreground font-medium text-sm shrink-0">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate" title={user.firmaAdi}>
              {user.firmaAdi}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono">{user.kod}</span>
              <span>·</span>
              <span>{user.tur}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2">
          <ThemeToggle />
          <form action={signOutAction} className="flex-1">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
            >
              <LogOut className="size-4" />
              Çıkış Yap
            </Button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-card/95 backdrop-blur px-4 h-14">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
        >
          <Menu className="size-5" />
        </Button>
        <Link href="/ozet" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex items-center justify-center size-7 rounded-md bg-primary text-primary-foreground">
            <FlaskConical className="size-4" />
          </span>
          <span>UNIQUE</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="relative flex w-72 max-w-[80vw] flex-col bg-sidebar text-sidebar-foreground border-r shadow-xl animate-in slide-in-from-left duration-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10"
              aria-label="Menüyü kapat"
            >
              <X className="size-5" />
            </Button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

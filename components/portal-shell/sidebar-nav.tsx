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
  group?: string;
}

const NAV: NavItem[] = [
  { href: "/ozet", label: "Özet", icon: LayoutDashboard, group: "Genel" },
  { href: "/talepler", label: "Test Talepleri", icon: FileText, group: "İşlemler" },
  { href: "/teklifler", label: "Teklifler", icon: FileSpreadsheet, group: "İşlemler" },
  { href: "/faturalar", label: "Faturalar", icon: Receipt, group: "Finans" },
  { href: "/termin", label: "Termin Takibi", icon: Clock, group: "İşlemler" },
  { href: "/belgeler", label: "Belgelerim", icon: FileCheck, group: "İşlemler" },
  { href: "/destek", label: "Destek Talepleri", icon: LifeBuoy, group: "Yardım" },
  { href: "/hesabim", label: "Hesabım", icon: User, group: "Hesap" },
];

const GROUPS = ["Genel", "İşlemler", "Finans", "Yardım", "Hesap"];

interface UserInfo {
  firmaAdi: string;
  kod: string;
  tur: string;
}

interface Props {
  user: UserInfo;
  signOutAction: () => void;
}

function NavContent({ user, signOutAction }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = (user.firmaAdi || user.kod)
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/ozet" className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center size-9 rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <FlaskConical className="size-5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-sidebar-foreground">
              UNIQUE
            </span>
            <span className="text-[11px] text-sidebar-muted">
              Services Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {GROUPS.map((group) => {
          const items = NAV.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-5 last:mb-0">
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active && "text-sidebar-primary"
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="inline-flex items-center justify-center size-9 rounded-full bg-sidebar-accent text-sidebar-accent-foreground font-medium text-xs shrink-0">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-medium text-sidebar-foreground truncate"
              title={user.firmaAdi}
            >
              {user.firmaAdi}
            </div>
            <div className="text-[11px] text-sidebar-muted flex items-center gap-1.5">
              <span className="font-mono">{user.kod}</span>
              <span>·</span>
              <span>{user.tur}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1">
          <ThemeToggle />
          <form action={signOutAction} className="flex-1">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" />
              Çıkış Yap
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function MobileTopBar({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 border-b bg-card/95 backdrop-blur px-4 h-14">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        aria-label="Menüyü aç"
      >
        <Menu className="size-5" />
      </Button>
      <Link href="/ozet" className="flex items-center gap-2 font-semibold">
        <span className="inline-flex items-center justify-center size-7 rounded-md bg-primary text-primary-foreground">
          <FlaskConical className="size-4" />
        </span>
        <span>UNIQUE Portal</span>
      </Link>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SidebarShell({ user, signOutAction, children }: Props & { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Desktop sidebar - fixed in grid column */}
      <aside className="hidden lg:flex bg-sidebar text-sidebar-foreground border-r border-sidebar-border lg:sticky lg:top-0 lg:h-screen">
        <div className="flex w-64 h-full">
          <NavContent user={user} signOutAction={signOutAction} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col min-w-0">
        <MobileTopBar onOpen={() => setOpen(true)} />
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl animate-in slide-in-from-left-4 duration-200">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Menüyü kapat"
            >
              <X className="size-5" />
            </Button>
            <NavContent user={user} signOutAction={signOutAction} />
          </aside>
        </div>
      )}
    </div>
  );
}

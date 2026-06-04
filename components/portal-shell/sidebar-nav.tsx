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
  Upload,
  LifeBuoy,
  User,
  Menu,
  X,
  LogOut,
  Mail,
} from "lucide-react";
import { UniqueLogo } from "@/components/unique-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BildirimBell } from "@/components/portal-shell/bildirim-bell";
import type { Bildirim } from "@/lib/repositories/bildirim";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/ozet", label: "Özet", icon: LayoutDashboard, group: "Genel" },
  { href: "/talepler", label: "Test Talepleri", icon: FileText, group: "İşlemler" },
  { href: "/teklifler", label: "Teklifler", icon: FileSpreadsheet, group: "İşlemler" },
  { href: "/faturalar", label: "Faturalar", icon: Receipt, group: "Finans" },
  { href: "/termin", label: "Termin Takibi", icon: Clock, group: "İşlemler" },
  { href: "/belgeler", label: "Belgelerim", icon: FileCheck, group: "İşlemler" },
  { href: "/belgeler/yukle", label: "Belge Yükle", icon: Upload, group: "Yönetim", adminOnly: true },
  { href: "/ayarlar/email", label: "Mail Ayarları", icon: Mail, group: "Yönetim", adminOnly: true },
  { href: "/destek", label: "Destek Talepleri", icon: LifeBuoy, group: "Yardım" },
  { href: "/hesabim", label: "Hesabım", icon: User, group: "Hesap" },
];

const GROUPS = ["Genel", "İşlemler", "Finans", "Yönetim", "Yardım", "Hesap"];

interface UserInfo {
  firmaAdi: string;
  kod: string;
  tur: string;
}

function navItemsForUser(tur: string): NavItem[] {
  const isAdmin = tur === "Admin";
  return NAV.filter((n) => !n.adminOnly || isAdmin);
}

type BildirimSerialized = Omit<Bildirim, "tarih"> & { tarih: string };

interface Props {
  user: UserInfo;
  signOutAction: () => void;
  bildirimler: BildirimSerialized[];
  lastSeen: string | null;
}

function NavContent({ user, signOutAction, bildirimler, lastSeen }: Props) {
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
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/ozet" className="flex items-center">
          <UniqueLogo size="md" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3">
        {GROUPS.map((group) => {
          const items = navItemsForUser(user.tur).filter(
            (n) => n.group === group
          );
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-6 last:mb-0">
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
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
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors relative",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-sidebar-primary" />
                        )}
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-sidebar-primary" : ""
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
          <div className="inline-flex items-center justify-center size-9 bg-sidebar-accent text-sidebar-accent-foreground font-medium text-xs shrink-0">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-medium text-sidebar-foreground truncate"
              title={user.firmaAdi}
            >
              {user.firmaAdi}
            </div>
            <div className="text-[10px] text-sidebar-muted flex items-center gap-1.5 uppercase tracking-wider">
              <span>{user.kod}</span>
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

export function MobileTopBar({
  onOpen,
  bildirimler,
  lastSeen,
}: {
  onOpen: () => void;
  bildirimler: BildirimSerialized[];
  lastSeen: string | null;
}) {
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
      <Link href="/ozet" className="flex items-center">
        <UniqueLogo size="sm" />
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <BildirimBell
          bildirimler={bildirimler}
          lastSeen={lastSeen}
          variant="topbar"
        />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SidebarShell({
  user,
  signOutAction,
  bildirimler,
  lastSeen,
  children,
}: Props & { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block bg-sidebar text-sidebar-foreground border-r border-sidebar-border lg:sticky lg:top-0 lg:h-screen overflow-hidden">
        <NavContent
          user={user}
          signOutAction={signOutAction}
          bildirimler={bildirimler}
          lastSeen={lastSeen}
        />
      </aside>

      {/* Main column */}
      <div className="flex flex-col min-w-0">
        <MobileTopBar
          onOpen={() => setOpen(true)}
          bildirimler={bildirimler}
          lastSeen={lastSeen}
        />
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Floating bildirim butonu — yalnız desktop (mobilde topbar versiyonu var) */}
      <div className="hidden lg:block">
        <BildirimBell
          bildirimler={bildirimler}
          lastSeen={lastSeen}
          variant="floating"
        />
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
            <NavContent
              user={user}
              signOutAction={signOutAction}
              bildirimler={bildirimler}
              lastSeen={lastSeen}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

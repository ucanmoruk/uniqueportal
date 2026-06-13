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
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { UniqueLogo } from "@/components/unique-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BildirimBell } from "@/components/portal-shell/bildirim-bell";
import { GlobalSearch } from "@/components/global-search";
import type { Bildirim } from "@/lib/repositories/bildirim";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/ozet", label: "Dashboard", icon: LayoutDashboard, group: "Genel" },
  { href: "/talepler", label: "Test Talepleri", icon: FileText, group: "İşlemler" },
  { href: "/teklifler", label: "Teklifler", icon: FileSpreadsheet, group: "İşlemler" },
  { href: "/faturalar", label: "Faturalar", icon: Receipt, group: "Finans" },
  { href: "/termin", label: "Termin Takibi", icon: Clock, group: "İşlemler" },
  { href: "/belgeler", label: "Belgelerim", icon: FileCheck, group: "İşlemler" },
  { href: "/belgeler/yukle", label: "Belge Yükle", icon: Upload, group: "Yönetim", adminOnly: true },
  { href: "/ayarlar/email", label: "Mail Ayarları", icon: Mail, group: "Yönetim", adminOnly: true },
  { href: "/destek", label: "Destek Talepleri", icon: LifeBuoy, group: "Yardım" },
  { href: "/bildirimler", label: "Bildirimler", icon: Bell, group: "Hesap" },
  { href: "/hesabim", label: "Hesabım", icon: User, group: "Hesap" },
];

const GROUPS = ["Genel", "İşlemler", "Finans", "Yönetim", "Yardım", "Hesap"];

const PAGE_TITLES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  "/ozet": { label: "Dashboard", icon: LayoutDashboard },
  "/talepler": { label: "Test Talepleri", icon: FileText },
  "/teklifler": { label: "Teklifler", icon: FileSpreadsheet },
  "/faturalar": { label: "Faturalar", icon: Receipt },
  "/termin": { label: "Termin Takibi", icon: Clock },
  "/belgeler": { label: "Belgelerim", icon: FileCheck },
  "/destek": { label: "Destek Talepleri", icon: LifeBuoy },
  "/bildirimler": { label: "Bildirimler", icon: Bell },
  "/hesabim": { label: "Hesabım", icon: User },
  "/ayarlar/email": { label: "Mail Ayarları", icon: Mail },
  "/belgeler/yukle": { label: "Belge Yükle", icon: Upload },
};

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

function NavContent({
  user,
  signOutAction,
  collapsed,
  onToggle,
}: Props & { collapsed: boolean; onToggle: () => void }) {
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
      {/* Brand + collapse toggle — sabit üst alan */}
      <div className={cn(
        "border-b border-sidebar-border flex items-center shrink-0",
        collapsed ? "justify-center px-2 py-4" : "justify-between px-5 py-5"
      )}>
        <Link href="/ozet" className="flex items-center">
          {collapsed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/favicon.png" alt="UNIQUE" className="size-8 object-contain" draggable={false} />
          ) : (
            <UniqueLogo size="md" />
          )}
        </Link>
      </div>

      {/* Global arama - sadece açıkken */}
      {!collapsed && (
        <div className="px-3 pt-4 shrink-0">
          <GlobalSearch variant="sidebar" />
        </div>
      )}

      {/* Nav */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-4",
        collapsed ? "px-2" : "px-3"
      )}>
        {GROUPS.map((group) => {
          const items = navItemsForUser(user.tur).filter(
            (n) => n.group === group
          );
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-5 last:mb-0">
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
                  {group}
                </div>
              )}
              {collapsed && <div className="mb-2 border-b border-sidebar-border" />}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center transition-colors relative",
                          collapsed
                            ? "justify-center px-2 py-2.5"
                            : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-[var(--uq-sidebar-item-bg-active)] text-[var(--uq-sidebar-item-text-active)]"
                            : "text-[var(--uq-sidebar-item-text)] hover:bg-[var(--uq-sidebar-item-bg-active)]/40 hover:text-[var(--uq-sidebar-item-text-hover)]"
                        )}
                      >
                        {active && !collapsed && (
                          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--uq-color-brand-primary)]" />
                        )}
                        {active && collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--uq-color-brand-primary)]" />
                        )}
                        <Icon
                          className={cn(
                            "shrink-0",
                            collapsed ? "size-5" : "size-[18px]",
                            active
                              ? "text-[var(--uq-sidebar-icon-active)]"
                              : "text-[var(--uq-sidebar-icon-default)]"
                          )}
                        />
                        {!collapsed && (
                          <span className="text-[14px] font-medium">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer - kullanıcı bilgisi */}
      <div className={cn(
        "border-t border-sidebar-border shrink-0",
        collapsed ? "p-2" : "p-3"
      )}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex items-center justify-center size-9 bg-sidebar-accent text-sidebar-accent-foreground font-medium text-xs shrink-0">
              {initials || "?"}
            </div>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground size-8"
                title="Çıkış Yap"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        ) : (
          <>
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
            <div className="mt-1 flex items-center gap-1">
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
          </>
        )}
      </div>
    </div>
  );
}

function DesktopTopBar({
  user,
  collapsed,
  onToggle,
}: {
  user: UserInfo;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  const basePath = "/" + pathname.split("/").filter(Boolean).slice(0, 2).join("/");
  const match = PAGE_TITLES[basePath] || PAGE_TITLES["/" + pathname.split("/").filter(Boolean)[0]];
  const pageTitle = match?.label || "Portal";
  const PageIcon = match?.icon || LayoutDashboard;

  return (
    <header className="hidden lg:flex sticky top-0 z-20 items-center justify-between border-b bg-[var(--uq-topbar-bg)] px-6 h-12">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-foreground">
          {pageTitle}
        </span>
      </div>
      <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {user.firmaAdi}
      </span>
    </header>
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
        <GlobalSearch variant="topbar" />
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
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  const sidebarWidth = collapsed ? "72px" : "256px";

  return (
    <div
      className="min-h-screen bg-background lg:grid"
      style={{
        gridTemplateColumns: `${sidebarWidth} minmax(0, 1fr)`,
      }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block bg-sidebar text-sidebar-foreground border-r border-sidebar-border lg:sticky lg:top-0 lg:h-screen overflow-hidden transition-[width] duration-200 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <NavContent
          user={user}
          signOutAction={signOutAction}
          bildirimler={bildirimler}
          lastSeen={lastSeen}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* Main column */}
      <div className="flex flex-col min-w-0">
        <MobileTopBar
          onOpen={() => setOpen(true)}
          bildirimler={bildirimler}
          lastSeen={lastSeen}
        />
        <DesktopTopBar
          user={user}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Floating bildirim butonu — yalnız desktop */}
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
              collapsed={false}
              onToggle={() => {}}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountInfo } from "@azure/msal-browser";
import {
  MessageSquare,
  CheckCircle2,
  Files,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  account: AccountInfo;
  onLogout: () => void;
  pendingApprovalsCount?: number;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

export function Sidebar({
  account,
  onLogout,
  pendingApprovalsCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      { href: "/", label: "Chat", icon: MessageSquare },
      {
        href: "/approvals",
        label: "Approvals",
        icon: CheckCircle2,
        badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      },
      { href: "/documents", label: "Documents", icon: Files },
      { href: "/history", label: "History", icon: History },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
    [pendingApprovalsCount]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const renderNavigation = () => (
    <nav className="space-y-0.5">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              active
                ? "text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            style={
              active
                ? { background: "var(--accent-bg)" }
                : undefined
            }
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "var(--bg-muted)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "";
            }}
          >
            <Icon
              className={`mr-3 h-[18px] w-[18px] transition-colors duration-150 ${
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
              }`}
            />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-full bg-[var(--error)] px-2 py-0.5 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const firstName = account.name?.split(" ")[0] || "User";

  return (
    <>
      {/* Mobile header */}
      <header
        className="border-b px-4 py-3 lg:hidden"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              M
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                M365 Operator
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {firstName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="rounded-lg p-2 transition-colors duration-150"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="animate-slide-up border-b px-4 py-4 lg:hidden"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          {renderNavigation()}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors duration-150"
              style={{ color: "var(--text-secondary)" }}
            >
              <LogOut className="mr-3 h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 hidden w-60 flex-col px-3 py-5 lg:flex"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3 px-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            M
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              M365 Operator
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              AI Workspace Assistant
            </p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1">{renderNavigation()}</div>

        {/* User card */}
        <div
          className="rounded-lg p-3"
          style={{
            background: "var(--bg-muted)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {firstName}
          </p>
          <p className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {account.username}
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm transition-colors duration-150"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--bg-surface)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "";
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

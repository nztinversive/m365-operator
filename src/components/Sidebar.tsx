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
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "text-[var(--accent-light)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            style={
              active
                ? { background: "var(--accent-bg)", boxShadow: "0 0 12px var(--accent-glow)" }
                : undefined
            }
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "var(--glass-bg-hover)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "";
            }}
          >
            <Icon
              className={`mr-3 h-[18px] w-[18px] transition-colors duration-200 ${
                active
                  ? "text-[var(--accent-light)]"
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
          background: "rgba(10, 11, 16, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "var(--glass-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                boxShadow: "0 4px 12px var(--accent-glow)",
              }}
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
            className="rounded-xl p-2 transition-all duration-200"
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
          style={{ background: "var(--bg-surface)", borderColor: "var(--glass-border)" }}
        >
          {renderNavigation()}
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm transition-all duration-200"
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
        className="fixed inset-y-0 hidden w-72 flex-col px-4 py-6 lg:flex"
        style={{
          background: "rgba(18, 19, 26, 0.6)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid var(--glass-border)",
        }}
      >
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
              boxShadow: "0 4px 16px var(--accent-glow)",
            }}
          >
            M
          </div>
          <div>
            <p
              className="text-[15px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
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
          className="rounded-2xl p-3"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
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
            className="mt-3 flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm transition-all duration-200"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.background = "var(--glass-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--glass-border)";
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

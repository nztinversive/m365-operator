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
    if (href === "/") {
      return pathname === "/";
    }
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
            className={`flex items-center rounded-xl px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-gray-800 text-white"
                : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
            }`}
          >
            <Icon className="mr-3 h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
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
      <header className="border-b border-gray-800 bg-gray-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
              M
            </div>
            <div>
              <p className="text-sm font-semibold text-white">M365 Operator</p>
              <p className="text-xs text-gray-400">{firstName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="border-b border-gray-800 bg-gray-900 px-4 py-4 lg:hidden">
          {renderNavigation()}
          <div className="mt-4 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-800/50 hover:text-white"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <aside className="fixed inset-y-0 hidden w-72 border-r border-gray-800 bg-gray-900 px-4 py-6 lg:flex lg:flex-col">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            M
          </div>
          <div>
            <p className="text-sm font-semibold text-white">M365 Operator</p>
            <p className="text-xs text-gray-400">Microsoft 365 Copilot</p>
          </div>
        </div>

        <div className="flex-1">{renderNavigation()}</div>

        <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-3">
          <p className="truncate text-sm font-medium text-white">{firstName}</p>
          <p className="truncate text-xs text-gray-400">{account.username}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

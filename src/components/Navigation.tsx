"use client";

import { useState } from "react";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
  Settings,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { AccountInfo } from "@azure/msal-browser";

interface NavigationProps {
  currentView: "chat" | "jobs" | "approvals" | "documents" | "settings";
  onViewChange: (view: "chat" | "jobs" | "approvals" | "documents" | "settings") => void;
  account: AccountInfo;
  onLogout: () => void;
  pendingApprovalsCount?: number;
}

export function Navigation({
  currentView,
  onViewChange,
  account,
  onLogout,
  pendingApprovalsCount = 0
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      id: "chat" as const,
      label: "Chat",
      icon: MessageSquare,
      description: "Operator interface"
    },
    {
      id: "jobs" as const,
      label: "Jobs",
      icon: Clock,
      description: "Job history and status"
    },
    {
      id: "approvals" as const,
      label: "Approvals",
      icon: CheckCircle,
      description: "Pending approvals",
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined
    },
    {
      id: "documents" as const,
      label: "Documents",
      icon: FileText,
      description: "Generated files"
    },
    {
      id: "settings" as const,
      label: "Settings",
      icon: Settings,
      description: "Integration settings"
    }
  ];

  const handleItemClick = (viewId: typeof currentView) => {
    onViewChange(viewId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo/Header */}
        <div
          className="flex items-center px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <div className="ml-3">
            <h1
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              M365 Operator
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors duration-150"
                style={{
                  background: isActive ? "var(--accent-bg)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--bg-muted)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon className="w-[18px] h-[18px] mr-3 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-2 text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center font-semibold"
                    style={{ background: "var(--error)", color: "white" }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              >
                <span className="text-xs font-semibold">
                  {account.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-2.5 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {account.name?.split(" ")[0] || "User"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-ghost)" }}>
                  {account.username}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 transition-colors rounded-lg"
              style={{ color: "var(--text-ghost)" }}
              title="Sign out"
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-ghost)"; }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div
        className="lg:hidden px-4 py-3"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <h1
              className="ml-3 text-sm font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              M365 Operator
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {pendingApprovalsCount > 0 && (
              <button
                onClick={() => handleItemClick("approvals")}
                className="relative p-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <CheckCircle className="w-5 h-5" />
                <span
                  className="absolute -top-1 -right-1 text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-semibold"
                  style={{ background: "var(--error)", color: "white" }}
                >
                  {pendingApprovalsCount}
                </span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <nav className="px-4 py-2 space-y-0.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors duration-150"
                  style={{
                    background: isActive ? "var(--accent-bg)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon className="w-[18px] h-[18px] mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className="ml-2 text-xs rounded-full px-2 py-0.5 font-semibold"
                      style={{ background: "var(--error)", color: "white" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* User section in mobile */}
            <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                  >
                    <span className="text-xs font-semibold">
                      {account.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-2.5 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {account.name?.split(" ")[0] || "User"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-ghost)" }}>
                      {account.username}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 transition-colors rounded-lg"
                  style={{ color: "var(--text-ghost)" }}
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

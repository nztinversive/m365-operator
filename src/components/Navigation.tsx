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
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-gray-900 lg:border-r lg:border-gray-800">
        {/* Logo/Header */}
        <div className="flex items-center px-6 py-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <div className="ml-3">
            <h1 className="text-white font-semibold">M365 Operator</h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">
                  {account.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm text-white truncate">
                  {account.name?.split(" ")[0] || "User"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {account.username}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <h1 className="ml-3 text-white font-semibold">M365 Operator</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Pending approvals indicator */}
            {pendingApprovalsCount > 0 && (
              <button
                onClick={() => handleItemClick("approvals")}
                className="relative p-2 text-gray-300 hover:text-white"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {pendingApprovalsCount}
                </span>
              </button>
            )}
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white"
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
        <div className="lg:hidden bg-gray-900 border-b border-gray-800">
          <nav className="px-4 py-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            
            {/* User section in mobile */}
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center min-w-0">
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {account.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3 min-w-0">
                    <p className="text-sm text-white truncate">
                      {account.name?.split(" ")[0] || "User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {account.username}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
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
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AccountInfo } from "@azure/msal-browser";
import { Navigation } from "./Navigation";
import { ChatView } from "./ChatView";
import { JobHistory } from "./JobHistory";
import { ApprovalQueue } from "./ApprovalQueue";
import { DocumentsPage } from "./DocumentsPage";
import { SettingsPage } from "./SettingsPage";

interface MainAppProps {
  account: AccountInfo;
  onLogout: () => void;
}

type ViewType = "chat" | "jobs" | "approvals" | "documents" | "settings";

export function MainApp({ account, onLogout }: MainAppProps) {
  const [currentView, setCurrentView] = useState<ViewType>("chat");

  // Get user data
  const user = useQuery(api.users.getByEmail, { email: account.username! });
  const pendingApprovals = useQuery(
    api.approvals.listPending, 
    user ? { userId: user._id } : "skip"
  );

  const renderCurrentView = () => {
    if (!user) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Setting up your account...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case "chat":
        return <ChatView account={account} onLogout={onLogout} />;
      case "jobs":
        return <JobHistory userId={user._id} />;
      case "approvals":
        return <ApprovalQueue userId={user._id} />;
      case "documents":
        return <DocumentsPage userId={user._id} />;
      case "settings":
        return <SettingsPage userId={user._id} account={account} />;
      default:
        return <ChatView account={account} onLogout={onLogout} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        account={account}
        onLogout={onLogout}
        pendingApprovalsCount={pendingApprovals?.length || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile header is included in Navigation component */}
        
        {/* Content */}
        <div className="h-full overflow-hidden">
          {currentView === "chat" ? (
            // Chat view takes full height
            renderCurrentView()
          ) : (
            // Other views have padding and scrolling
            <div className="h-full overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 py-6">
                {renderCurrentView()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
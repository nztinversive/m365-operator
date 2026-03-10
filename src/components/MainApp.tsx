"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userSetupError, setUserSetupError] = useState<string | null>(null);
  const getOrCreateUser = useMutation(api.users.getOrCreate);

  // Get user data
  const user = useQuery(api.users.getByEmail, { email: account.username! });
  const pendingApprovals = useQuery(
    api.approvals.listPending, 
    user ? { userId: user._id } : "skip"
  );

  useEffect(() => {
    if (user !== null || isCreatingUser || !account.username) {
      return;
    }

    const ensureUser = async () => {
      try {
        setIsCreatingUser(true);
        setUserSetupError(null);
        await getOrCreateUser({
          email: account.username,
          name: account.name || account.username,
          microsoftId: account.homeAccountId,
        });
      } catch (error) {
        console.error("Failed to create user:", error);
        setUserSetupError(
          error instanceof Error ? error.message : "Unable to finish account setup."
        );
      } finally {
        setIsCreatingUser(false);
      }
    };

    void ensureUser();
  }, [
    account.homeAccountId,
    account.name,
    account.username,
    getOrCreateUser,
    isCreatingUser,
    user,
  ]);

  const renderCurrentView = () => {
    if (userSetupError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600 font-medium">Account setup failed</p>
            <p className="text-gray-600 mt-2">{userSetupError}</p>
          </div>
        </div>
      );
    }

    if (user === undefined || user === null || isCreatingUser) {
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

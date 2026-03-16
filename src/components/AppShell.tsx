"use client";

import { useEffect, type ReactNode, useState } from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { allScopes } from "@/lib/msal-config";
import { useTokenSync } from "@/hooks/useTokenSync";
import { LoginScreen } from "./LoginScreen";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: (session: {
    userId: Id<"users">;
    account: AccountInfo;
    onLogout: () => void;
  }) => ReactNode;
  fullHeight?: boolean;
}

export function AppShell({ children, fullHeight = false }: AppShellProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const account = accounts[0];
  const getOrCreateUser = useMutation(api.users.getOrCreate);

  const user = useQuery(
    api.users.getByEmail,
    account?.username ? { email: account.username } : "skip"
  );

  const pendingApprovals = useQuery(
    api.approvals.getPendingApprovals,
    user ? { userId: user._id } : "skip"
  );

  useTokenSync({
    userId: user?._id,
    account,
    enabled: Boolean(account && user && !isCreatingUser),
  });

  const handleLogin = async () => {
    try {
      await instance.loginRedirect({ scopes: allScopes });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    await instance.logoutRedirect();
  };

  useEffect(() => {
    if (!isAuthenticated || !account?.username || user !== null || isCreatingUser) {
      return;
    }

    const ensureUser = async () => {
      try {
        setIsCreatingUser(true);
        setSetupError(null);
        await getOrCreateUser({
          email: account.username,
          name: account.name || account.username,
          microsoftId: account.homeAccountId,
        });
      } catch (error) {
        console.error("Failed to create user:", error);
        setSetupError(
          error instanceof Error
            ? error.message
            : "Unable to finish account setup."
        );
      } finally {
        setIsCreatingUser(false);
      }
    };

    void ensureUser();
  }, [
    account?.homeAccountId,
    account?.name,
    account?.username,
    getOrCreateUser,
    isAuthenticated,
    isCreatingUser,
    user,
  ]);

  // Wait for MSAL to fully initialize before showing login screen.
  // useIsAuthenticated can briefly return false during init even with cached accounts.
  const allAccounts = instance.getAllAccounts();
  if (!isAuthenticated && allAccounts.length === 0 && !account) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Still initializing — MSAL has accounts but hasn't set active yet
  if (!account && allAccounts.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
      </div>
    );
  }

  if (!account) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (setupError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-red-400">Account setup failed</p>
          <p className="mt-2 text-sm text-gray-300">{setupError}</p>
        </div>
      </div>
    );
  }

  if (user === undefined || user === null || isCreatingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Sidebar
        account={account}
        onLogout={() => {
          void handleLogout();
        }}
        pendingApprovalsCount={pendingApprovals?.length ?? 0}
      />

      <main
        className={`lg:pl-72 ${
          fullHeight ? "h-[calc(100dvh-4rem)] lg:h-screen" : "min-h-[calc(100dvh-4rem)] lg:min-h-screen"
        }`}
      >
        <div className={fullHeight ? "h-full" : "mx-auto max-w-7xl px-4 py-6 lg:px-10 lg:py-8"}>
          {children({
            userId: user._id,
            account,
            onLogout: () => {
              void handleLogout();
            },
          })}
        </div>
      </main>
    </div>
  );
}

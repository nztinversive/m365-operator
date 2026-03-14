"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { allScopes } from "@/lib/msal-config";
import { MainApp } from "@/components/MainApp";
import { LoginScreen } from "@/components/LoginScreen";

export default function Home() {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup({ 
        scopes: allScopes,
        redirectUri: `${window.location.origin}/redirect.html`
      });
    } catch (err: unknown) {
      // If popup was blocked, fall back to redirect flow
      const error = err as { errorCode?: string };
      if (error.errorCode === "popup_window_error" || error.errorCode === "empty_window_error") {
        console.warn("Popup blocked, falling back to redirect...");
        await instance.loginRedirect({ scopes: allScopes });
      } else {
        console.error("Login failed:", err);
      }
    }
  };

  const handleLogout = async () => {
    await instance.logoutPopup();
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <MainApp
      account={accounts[0]}
      onLogout={handleLogout}
    />
  );
}

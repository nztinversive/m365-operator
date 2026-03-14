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
      await instance.loginRedirect({ scopes: allScopes });
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = async () => {
    await instance.logoutRedirect();
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

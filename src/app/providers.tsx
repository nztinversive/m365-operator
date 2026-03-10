"use client";

import { ReactNode, useEffect, useState } from "react";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { msalConfig } from "@/lib/msal-config";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

let msalInstance: PublicClientApplication | null = null;

function getMsalInstance(): PublicClientApplication {
  if (typeof window === "undefined") {
    // Return a dummy during SSR — will never be used
    return null as unknown as PublicClientApplication;
  }
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }
  return msalInstance;
}

export function Providers({ children }: { children: ReactNode }) {
  const [msalReady, setMsalReady] = useState(false);
  const [pca] = useState(getMsalInstance);

  useEffect(() => {
    pca.initialize().then(() => {
      // Handle redirect response
      pca.handleRedirectPromise().then((response) => {
        if (response) {
          pca.setActiveAccount(response.account);
        } else {
          const accounts = pca.getAllAccounts();
          if (accounts.length > 0) {
            pca.setActiveAccount(accounts[0]);
          }
        }
        setMsalReady(true);
      });

      // Listen for login events
      pca.addEventCallback((event) => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const payload = event.payload as { account: Parameters<typeof pca.setActiveAccount>[0] };
          pca.setActiveAccount(payload.account);
        }
      });
    });
  }, [pca]);

  if (!msalReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <MsalProvider instance={pca}>
      <ConvexProvider client={convex}>
        {children}
      </ConvexProvider>
    </MsalProvider>
  );
}

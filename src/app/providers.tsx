"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  EventType,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { allScopes, msalConfig } from "@/lib/msal-config";
import { api } from "../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

let msalInstance: PublicClientApplication | null = null;
let convexInstance: ConvexReactClient | null = null;

function getMsalInstance(): PublicClientApplication {
  if (typeof window === "undefined") {
    return null as unknown as PublicClientApplication;
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
  }

  return msalInstance;
}

function getConvexInstance(): ConvexReactClient | null {
  if (typeof window === "undefined" || !convexUrl) {
    return null;
  }

  if (!convexInstance) {
    convexInstance = new ConvexReactClient(convexUrl);
  }

  return convexInstance;
}

function extractRefreshToken(result: AuthenticationResult): string | undefined {
  const refreshToken = (result as AuthenticationResult & { refreshToken?: unknown }).refreshToken;
  return typeof refreshToken === "string" && refreshToken.length > 0
    ? refreshToken
    : undefined;
}

export function Providers({ children }: { children: ReactNode }) {
  const [msalReady, setMsalReady] = useState(false);
  const [isPopup] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.opener !== null && window.opener !== window;
  });
  const [pca] = useState(getMsalInstance);
  const convexClient = getConvexInstance();

  const syncAccountToConvex = useCallback(
    async (account: AccountInfo, initialResult?: AuthenticationResult | null) => {
      if (!convexClient || !account.username) {
        return;
      }

      try {
        const tokenResult =
          initialResult?.accessToken && initialResult.account?.homeAccountId === account.homeAccountId
            ? initialResult
            : await pca.acquireTokenSilent({
                account,
                scopes: allScopes,
              });

        if (!tokenResult?.accessToken) {
          return;
        }

        const userId = await convexClient.mutation(api.users.getOrCreate, {
          email: account.username,
          name: account.name || account.username,
          microsoftId: account.homeAccountId,
        });

        await convexClient.mutation(api.microsoftConnections.upsertConnection, {
          userId,
          accessToken: tokenResult.accessToken,
          refreshToken: extractRefreshToken(tokenResult),
          expiresAt:
            tokenResult.expiresOn?.getTime() ?? Date.now() + 60 * 60 * 1000,
          email: account.username,
          displayName: account.name || account.username,
        });
      } catch (error) {
        console.error("[MSAL] Failed to sync token to Convex:", error);
      }
    },
    [convexClient, pca]
  );

  useEffect(() => {
    let callbackId: string | null = null;

    pca
      .initialize()
      .then(() => {
        callbackId = pca.addEventCallback((event) => {
          if (event.eventType !== EventType.LOGIN_SUCCESS || !event.payload) {
            return;
          }

          const payload = event.payload as AuthenticationResult;
          if (payload.account) {
            pca.setActiveAccount(payload.account);
            void syncAccountToConvex(payload.account, payload);
          }
        });

        return pca.handleRedirectPromise();
      })
      .then((response) => {
        if (response?.account) {
          pca.setActiveAccount(response.account);
          void syncAccountToConvex(response.account, response);
          return;
        }

        const accounts = pca.getAllAccounts();
        if (accounts.length > 0) {
          pca.setActiveAccount(accounts[0]);
          void syncAccountToConvex(accounts[0], null);
        }
      })
      .catch((error) => {
        console.error("[MSAL] Initialization error:", error);
      })
      .finally(() => {
        setMsalReady(true);
      });

    return () => {
      if (callbackId) {
        pca.removeEventCallback(callbackId);
      }
    };
  }, [pca, syncAccountToConvex]);

  if (isPopup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        <div className="animate-pulse">Completing sign-in...</div>
      </div>
    );
  }

  if (!convexUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-center text-gray-200">
        <div>
          <p className="text-lg font-semibold">Missing Convex configuration</p>
          <p className="mt-2 text-sm text-gray-400">
            Set <code className="rounded bg-gray-900 px-1 py-0.5">NEXT_PUBLIC_CONVEX_URL</code> before starting the app.
          </p>
        </div>
      </div>
    );
  }

  if (!msalReady || !convexClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <MsalProvider instance={pca}>
      <ConvexProvider client={convexClient}>{children}</ConvexProvider>
    </MsalProvider>
  );
}

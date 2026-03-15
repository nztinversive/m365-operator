"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { allScopes } from "@/lib/msal-config";

// Sync every 5 minutes to keep the token fresh while the page is open
const TOKEN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function extractRefreshToken(result: AuthenticationResult): string | undefined {
  const refreshToken = (result as AuthenticationResult & { refreshToken?: unknown }).refreshToken;
  return typeof refreshToken === "string" && refreshToken.length > 0
    ? refreshToken
    : undefined;
}

// Try to extract refresh token from MSAL's internal cache (localStorage)
function extractRefreshTokenFromCache(): string | undefined {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("refreshtoken")) {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed.secret) {
            return parsed.secret;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

interface UseTokenSyncOptions {
  userId?: Id<"users">;
  account?: AccountInfo;
  enabled?: boolean;
}

export function useTokenSync({ userId, account, enabled = true }: UseTokenSyncOptions) {
  const { instance } = useMsal();
  const upsertConnection = useMutation(api.microsoftConnections.upsertConnection);
  const isSyncing = useRef(false);

  const syncToken = useCallback(async () => {
    if (!enabled || !userId || !account || !account.username) {
      return;
    }

    // Prevent concurrent syncs
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const tokenResult = await instance.acquireTokenSilent({
        account,
        scopes: allScopes,
        forceRefresh: false,
      });

      // Try to get refresh token from MSAL result or from cache
      const refreshToken = extractRefreshToken(tokenResult) || extractRefreshTokenFromCache();

      await upsertConnection({
        userId,
        accessToken: tokenResult.accessToken,
        refreshToken,
        expiresAt: tokenResult.expiresOn?.getTime() ?? Date.now() + 60 * 60 * 1000,
        email: account.username,
        displayName: account.name || account.username,
      });

      console.log("[TokenSync] Synced token, expires:", tokenResult.expiresOn?.toISOString());
    } catch (error) {
      console.error("[TokenSync] Failed:", error);
      
      // If silent fails, try interactive as a last resort (popup)
      try {
        const tokenResult = await instance.acquireTokenPopup({
          account,
          scopes: allScopes,
        });

        const refreshToken = extractRefreshToken(tokenResult) || extractRefreshTokenFromCache();

        await upsertConnection({
          userId,
          accessToken: tokenResult.accessToken,
          refreshToken,
          expiresAt: tokenResult.expiresOn?.getTime() ?? Date.now() + 60 * 60 * 1000,
          email: account.username,
          displayName: account.name || account.username,
        });
      } catch (popupError) {
        console.error("[TokenSync] Popup fallback failed:", popupError);
      }
    } finally {
      isSyncing.current = false;
    }
  }, [account, enabled, instance, upsertConnection, userId]);

  useEffect(() => {
    if (!enabled || !userId || !account) {
      return;
    }

    // Sync immediately on mount
    void syncToken();

    // Sync on interval
    const intervalId = window.setInterval(() => {
      void syncToken();
    }, TOKEN_SYNC_INTERVAL_MS);

    // Sync when the page becomes visible again (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncToken();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Sync when the window gets focus
    const handleFocus = () => {
      void syncToken();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [account, enabled, syncToken, userId]);

  return { syncToken };
}

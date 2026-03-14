"use client";

import { useCallback, useEffect } from "react";
import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { allScopes } from "@/lib/msal-config";

const TOKEN_SYNC_INTERVAL_MS = 30 * 60 * 1000;

function extractRefreshToken(result: AuthenticationResult): string | undefined {
  const refreshToken = (result as AuthenticationResult & { refreshToken?: unknown }).refreshToken;
  return typeof refreshToken === "string" && refreshToken.length > 0
    ? refreshToken
    : undefined;
}

interface UseTokenSyncOptions {
  userId?: Id<"users">;
  account?: AccountInfo;
  enabled?: boolean;
}

export function useTokenSync({ userId, account, enabled = true }: UseTokenSyncOptions) {
  const { instance } = useMsal();
  const upsertConnection = useMutation(api.microsoftConnections.upsertConnection);

  const syncToken = useCallback(async () => {
    if (!enabled || !userId || !account || !account.username) {
      return;
    }

    try {
      const tokenResult = await instance.acquireTokenSilent({
        account,
        scopes: allScopes,
      });

      await upsertConnection({
        userId,
        accessToken: tokenResult.accessToken,
        refreshToken: extractRefreshToken(tokenResult),
        expiresAt: tokenResult.expiresOn?.getTime() ?? Date.now() + 60 * 60 * 1000,
        email: account.username,
        displayName: account.name || account.username,
      });
    } catch (error) {
      console.error("[MSAL] Periodic token sync failed:", error);
    }
  }, [account, enabled, instance, upsertConnection, userId]);

  useEffect(() => {
    if (!enabled || !userId || !account) {
      return;
    }

    void syncToken();

    const intervalId = window.setInterval(() => {
      void syncToken();
    }, TOKEN_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [account, enabled, syncToken, userId]);

  return { syncToken };
}

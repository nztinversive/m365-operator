"use client";

import { useMsal } from "@azure/msal-react";
import { useCallback } from "react";
import { createGraphClient } from "@/lib/graph-client";
import { graphScopes, loginScopes } from "@/lib/msal-config";

export function useGraphClient() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const getClient = useCallback(async () => {
    if (!account) throw new Error("Not signed in");

    try {
      const response = await instance.acquireTokenSilent({
        scopes: [...loginScopes, ...graphScopes],
        account,
      });
      return createGraphClient(response.accessToken);
    } catch {
      // Silent token failed, try popup
      const response = await instance.acquireTokenPopup({
        scopes: [...loginScopes, ...graphScopes],
        account,
      });
      return createGraphClient(response.accessToken);
    }
  }, [instance, account]);

  return { getClient, isSignedIn: !!account, account };
}

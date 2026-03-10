import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "common"}`,
    redirectUri: typeof window !== "undefined" ? window.location.origin : "",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error("[MSAL]", message);
      },
      logLevel: LogLevel.Error,
    },
  },
};

// Scopes needed for V1
export const loginScopes = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
];

export const graphScopes = [
  "Mail.Read",
  "Mail.Send",
  "Calendars.ReadWrite",
  "Files.ReadWrite",
];

export const allScopes = [...loginScopes, ...graphScopes];

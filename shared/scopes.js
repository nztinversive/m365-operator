/**
 * Unified Microsoft Graph API scopes.
 *
 * Both the Next.js frontend (MSAL login) and the background worker
 * (token refresh) MUST request the same set of scopes. If they diverge,
 * the refresh token will mint an access token missing permissions and
 * Graph calls will fail with 403.
 */
/** Identity / session scopes – always requested. */
export const loginScopes = [
    "openid",
    "profile",
    "offline_access",
    "User.Read",
];
/** Microsoft Graph resource scopes – the actual permissions we need. */
export const graphScopes = [
    "Mail.Read",
    "Mail.ReadWrite",
    "Mail.Send",
    "Calendars.ReadWrite",
    "Files.ReadWrite",
    "Team.ReadBasic.All",
    "Channel.ReadBasic.All",
    "ChannelMessage.Read.All",
    "ChannelMessage.Send",
    "Chat.Read",
    "ChatMessage.Send",
];
/** Combined scopes – used for both initial login and token refresh. */
export const allScopes = [...loginScopes, ...graphScopes];
/** Space-separated string suitable for OAuth2 token endpoint `scope` param. */
export const allScopesString = allScopes.join(" ");

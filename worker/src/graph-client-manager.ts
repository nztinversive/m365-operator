import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference } from 'convex/server';
import { Client } from '@microsoft/microsoft-graph-client';
import { api } from '../../convex/_generated/api.js';
import { allScopesString } from '../../shared/scopes.js';

export interface GraphClientConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface UserTokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email: string;
  displayName?: string;
}

export class GraphClientManager {
  private readonly tokenCache = new Map<string, UserTokenInfo>();
  private readonly getConnectionRef =
    api.microsoftConnections.getConnection as unknown as FunctionReference<'query'>;
  private readonly upsertConnectionRef =
    api.microsoftConnections.upsertConnection as unknown as FunctionReference<'mutation'>;

  constructor(
    private readonly config: GraphClientConfig,
    private readonly convex: ConvexHttpClient
  ) {}

  async getClientForUser(userId: string): Promise<Client> {
    const tokenInfo = await this.getUserTokenInfo(userId);

    // Refresh if expired or close to expiry (within 5 minutes).
    const now = Date.now();
    const expirationBuffer = 5 * 60 * 1000;

    if (now >= tokenInfo.expiresAt - expirationBuffer) {
      const refreshedTokenInfo = await this.refreshUserToken(userId, tokenInfo);
      this.tokenCache.set(userId, refreshedTokenInfo);
      return this.createGraphClient(refreshedTokenInfo.accessToken);
    }

    return this.createGraphClient(tokenInfo.accessToken);
  }

  private createGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  private async getUserTokenInfo(userId: string): Promise<UserTokenInfo> {
    const cached = this.tokenCache.get(userId);
    if (cached) {
      return cached;
    }

    const connection = await this.convex.query(this.getConnectionRef, { userId });

    if (!connection) {
      throw new Error(`No Microsoft connection found for user ${userId}.`);
    }

    const tokenInfo: UserTokenInfo = {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.expiresAt,
      email: connection.email,
      displayName: connection.displayName,
    };

    this.tokenCache.set(userId, tokenInfo);
    return tokenInfo;
  }

  private async refreshUserToken(
    userId: string,
    tokenInfo: UserTokenInfo
  ): Promise<UserTokenInfo> {
    if (!tokenInfo.refreshToken) {
      // Clear the cached expired token so next attempt fetches fresh from Convex
      this.tokenCache.delete(userId);
      throw new Error(
        'Your Microsoft session has expired. Please open the M365 Operator app in your browser to refresh your connection, then try again.'
      );
    }

    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', tokenInfo.refreshToken);
      params.append('scope', allScopesString);

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenResponse = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const newTokenInfo: UserTokenInfo = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || tokenInfo.refreshToken,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
        email: tokenInfo.email,
        displayName: tokenInfo.displayName,
      };

      await this.convex.mutation(this.upsertConnectionRef, {
        userId,
        accessToken: newTokenInfo.accessToken,
        ...(newTokenInfo.refreshToken
          ? { refreshToken: newTokenInfo.refreshToken }
          : {}),
        expiresAt: newTokenInfo.expiresAt,
        email: newTokenInfo.email,
        displayName: newTokenInfo.displayName,
      });

      console.log(`Refreshed token for user ${userId}`);
      return newTokenInfo;
    } catch (error) {
      console.error(`Failed to refresh token for user ${userId}:`, error);
      throw new Error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getApplicationToken(): Promise<string> {
    throw new Error('Application token not implemented in this version');
  }

  clearUserTokenCache(userId: string): void {
    this.tokenCache.delete(userId);
  }

  clearAllTokenCache(): void {
    this.tokenCache.clear();
  }
}

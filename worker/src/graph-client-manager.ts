import { Client } from '@microsoft/microsoft-graph-client';

export interface GraphClientConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface UserTokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export class GraphClientManager {
  private config: GraphClientConfig;
  private tokenCache = new Map<string, UserTokenInfo>();

  constructor(config: GraphClientConfig) {
    this.config = config;
  }

  async getClientForUser(userId: string): Promise<Client> {
    const tokenInfo = await this.getUserTokenInfo(userId);
    
    // Check if token is expired or about to expire (within 5 minutes)
    const now = Date.now();
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    if (now >= (tokenInfo.expiresAt - expirationBuffer)) {
      // Token is expired or about to expire, refresh it
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
    // Check cache first
    const cached = this.tokenCache.get(userId);
    if (cached) {
      return cached;
    }

    // TODO: Fetch from Convex database
    // For now, throw an error - this should be implemented to fetch from the microsoftConnections table
    throw new Error(`No token info found for user ${userId}. This should fetch from Convex microsoftConnections table.`);
  }

  private async refreshUserToken(userId: string, tokenInfo: UserTokenInfo): Promise<UserTokenInfo> {
    if (!tokenInfo.refreshToken) {
      throw new Error(`No refresh token available for user ${userId}`);
    }

    try {
      const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', tokenInfo.refreshToken);
      params.append('scope', 'https://graph.microsoft.com/.default');

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

      const tokenResponse = await response.json();
      
      const newTokenInfo: UserTokenInfo = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || tokenInfo.refreshToken,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      };

      // TODO: Update token in Convex database
      // This should call convex.mutation('microsoftConnections:updateTokens', { ... })
      
      console.log(`✅ Refreshed token for user ${userId}`);
      return newTokenInfo;

    } catch (error) {
      console.error(`❌ Failed to refresh token for user ${userId}:`, error);
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApplicationToken(): Promise<string> {
    // For app-only scenarios (not implemented in this version)
    // This would use client credentials flow
    throw new Error('Application token not implemented in this version');
  }

  clearUserTokenCache(userId: string): void {
    this.tokenCache.delete(userId);
  }

  clearAllTokenCache(): void {
    this.tokenCache.clear();
  }
}
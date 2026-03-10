"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AccountInfo } from "@azure/msal-browser";
import { useState } from "react";
import {
  Shield,
  Key,
  Bell,
  User,
  Mail,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface SettingsPageProps {
  userId: Id<"users">;
  account: AccountInfo;
}

export function SettingsPage({ userId, account }: SettingsPageProps) {
  const user = useQuery(api.users.getByEmail, { email: account.username! });
  const msConnection = useQuery(api.microsoftConnections.getByUserId, { userId });
  const isTokenExpired = useQuery(api.microsoftConnections.isTokenExpired, { userId });
  
  const removeConnection = useMutation(api.microsoftConnections.remove);
  
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnectMicrosoft = async () => {
    if (!confirm("Are you sure you want to disconnect your Microsoft account? This will stop all automated tasks.")) {
      return;
    }

    try {
      setIsDisconnecting(true);
      await removeConnection({ userId });
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert("Failed to disconnect Microsoft account. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatScopes = (scopes: string[]) => {
    const scopeDescriptions: Record<string, string> = {
      'openid': 'Basic sign-in',
      'profile': 'Profile information',
      'offline_access': 'Offline access',
      'User.Read': 'Read user profile',
      'Mail.Read': 'Read emails',
      'Mail.Send': 'Send emails',
      'Calendars.ReadWrite': 'Read and write calendar',
      'Team.ReadBasic.All': 'Read Teams information',
      'Channel.ReadBasic.All': 'Read channel information',
      'ChannelMessage.Read.All': 'Read channel messages',
      'ChannelMessage.Send': 'Send channel messages',
      'Files.ReadWrite': 'Read and write files',
    };

    return scopes.map(scope => scopeDescriptions[scope] || scope);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your integrations and preferences
        </p>
      </div>

      {/* User Profile Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">User Profile</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm text-gray-900">{account.name || "Not provided"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm text-gray-900">{account.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Account created</span>
            <span className="text-sm text-gray-900">
              {user ? formatDate(user.createdAt) : "Loading..."}
            </span>
          </div>
        </div>
      </div>

      {/* Microsoft 365 Integration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">Microsoft 365 Integration</h2>
          </div>
          
          {msConnection ? (
            <div className="flex items-center space-x-2">
              {isTokenExpired ? (
                <div className="flex items-center space-x-1 text-yellow-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Token expired</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Connected</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-gray-400">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">Not connected</span>
            </div>
          )}
        </div>

        {msConnection ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Connected</span>
                <span className="text-sm text-gray-900">
                  {formatDate(msConnection.connectedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last updated</span>
                <span className="text-sm text-gray-900">
                  {formatDate(msConnection.updatedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Token expires</span>
                <span className={`text-sm ${isTokenExpired ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(msConnection.expiresAt)}
                  {isTokenExpired && " (Expired)"}
                </span>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Granted Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {formatScopes(msConnection.scopes).map((scope, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    <span>{scope}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                {isTokenExpired && (
                  <button
                    onClick={() => {
                      // TODO: Implement token refresh or re-authentication flow
                      alert("Please sign out and sign back in to refresh your connection.");
                    }}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Connection</span>
                  </button>
                )}
                
                <button
                  onClick={handleDisconnectMicrosoft}
                  disabled={isDisconnecting}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Not Connected</h3>
            <p className="text-gray-500 mb-4">
              Connect your Microsoft 365 account to enable the operator features.
            </p>
            <p className="text-sm text-gray-400">
              Sign out and sign back in to connect your Microsoft account.
            </p>
          </div>
        )}
      </div>

      {/* Capabilities Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Available Capabilities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Email Management</h3>
              <p className="text-xs text-gray-600">Read, send, and summarize emails</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Calendar Access</h3>
              <p className="text-xs text-gray-600">Read and create calendar events</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Teams Integration</h3>
              <p className="text-xs text-gray-600">Read and post to Teams channels</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Document Generation</h3>
              <p className="text-xs text-gray-600">Create Word, Excel, and PowerPoint files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Key className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-medium text-gray-900">Data & Privacy</h2>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <p>
            • Your data is processed securely and is not shared with third parties
          </p>
          <p>
            • Microsoft credentials are encrypted and stored securely
          </p>
          <p>
            • You can disconnect your account and delete your data at any time
          </p>
          <p>
            • Generated documents are saved to your OneDrive/SharePoint
          </p>
        </div>
      </div>
    </div>
  );
}
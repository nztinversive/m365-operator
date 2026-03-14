"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AccountInfo } from "@azure/msal-browser";
import { useEffect, useState } from "react";
import { allScopes } from "@/lib/msal-config";
import {
  Shield,
  Key,
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
  Bot,
  ClipboardPaste,
  Loader2,
} from "lucide-react";

interface SettingsPageProps {
  userId: Id<"users">;
  account: AccountInfo;
}

type AIProvider = "claude_max" | "claude_api";

const CLAUDE_MODEL_OPTIONS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-sonnet-4-20250514",
];

const DEFAULT_CLAUDE_MODEL = "claude-opus-4-6";

export function SettingsPage({ userId, account }: SettingsPageProps) {
  const user = useQuery(api.users.getByEmail, { email: account.username! });
  const msConnection = useQuery(api.microsoftConnections.getConnection, { userId });
  const isTokenExpired = useQuery(api.microsoftConnections.isTokenExpired, { userId });
  const aiSettings = useQuery(api.userSettings.getSettings, { userId });
  
  const removeConnection = useMutation(api.microsoftConnections.remove);
  const updateAiSettings = useMutation(api.userSettings.updateSettings);
  
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>("claude_max");
  const [claudeMaxToken, setClaudeMaxToken] = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [claudeModel, setClaudeModel] = useState(DEFAULT_CLAUDE_MODEL);
  const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);
  const [isTestingAiSettings, setIsTestingAiSettings] = useState(false);
  const [aiMessage, setAiMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [aiSettingsInitialized, setAiSettingsInitialized] = useState(false);

  useEffect(() => {
    if (!aiSettings || aiSettingsInitialized) {
      return;
    }

    setAiProvider(aiSettings.aiProvider);
    setClaudeMaxToken(aiSettings.claudeMaxToken ?? "");
    setClaudeApiKey(aiSettings.claudeApiKey ?? "");
    setClaudeModel(aiSettings.claudeModel ?? DEFAULT_CLAUDE_MODEL);
    setAiSettingsInitialized(true);
  }, [aiSettings, aiSettingsInitialized]);

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

  const maskToken = (token: string) => {
    if (token.length <= 15) {
      return token;
    }
    return `${token.slice(0, 15)}...`;
  };

  const handlePasteToken = async (provider: AIProvider) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is not available in this browser.");
      }

      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        throw new Error("Clipboard is empty.");
      }

      if (provider === "claude_max") {
        setClaudeMaxToken(text);
      } else {
        setClaudeApiKey(text);
      }

      setAiMessage(null);
    } catch (error) {
      console.error("Failed to paste token:", error);
      setAiMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to paste token.",
      });
    }
  };

  const handleSaveAiProviderSettings = async () => {
    try {
      setIsSavingAiSettings(true);
      setAiMessage(null);

      const normalizedMaxToken = claudeMaxToken.trim();
      const normalizedApiKey = claudeApiKey.trim();
      const normalizedModel = claudeModel.trim() || DEFAULT_CLAUDE_MODEL;

      await updateAiSettings({
        userId,
        aiProvider,
        claudeMaxToken: normalizedMaxToken || undefined,
        claudeApiKey: normalizedApiKey || undefined,
        claudeModel: normalizedModel,
      });

      setClaudeMaxToken(normalizedMaxToken);
      setClaudeApiKey(normalizedApiKey);
      setClaudeModel(normalizedModel);
      setAiMessage({ type: "success", text: "AI provider settings saved." });
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      setAiMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save AI settings.",
      });
    } finally {
      setIsSavingAiSettings(false);
    }
  };

  const handleTestAiSettings = async () => {
    const tokenToTest = (aiProvider === "claude_max" ? claudeMaxToken : claudeApiKey).trim();
    const providerLabel = aiProvider === "claude_max" ? "Claude Max token" : "Claude API key";

    if (!tokenToTest) {
      setAiMessage({
        type: "error",
        text: `${providerLabel} is empty. Paste or enter a token before testing.`,
      });
      return;
    }

    try {
      setIsTestingAiSettings(true);
      setAiMessage(null);

      const response = await fetch("/api/test-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: tokenToTest,
          provider: aiProvider,
          model: claudeModel,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Token test failed.");
      }

      setAiMessage({
        type: "success",
        text: "Connection test succeeded.",
      });
    } catch (error) {
      console.error("AI token test failed:", error);
      setAiMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Connection test failed.",
      });
    } finally {
      setIsTestingAiSettings(false);
    }
  };

  const selectedToken = (aiProvider === "claude_max" ? claudeMaxToken : claudeApiKey).trim();
  const isProviderConfigured = selectedToken.length > 0;

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
                <span className="text-sm text-gray-500">Connection email</span>
                <span className="text-sm text-gray-900">
                  {msConnection.email}
                </span>
              </div>
              {msConnection.displayName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Display name</span>
                  <span className="text-sm text-gray-900">{msConnection.displayName}</span>
                </div>
              )}
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
                {formatScopes(allScopes).map((scope, index) => (
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

      {/* AI Provider */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bot className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">AI Provider</h2>
          </div>

          <div
            className={`flex items-center space-x-2 ${
              isProviderConfigured ? "text-green-600" : "text-red-600"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isProviderConfigured ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium">
              {isProviderConfigured ? "Connected" : "Not configured"}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-900">Provider</label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="border border-gray-200 rounded-lg px-3 py-2 flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="ai-provider"
                  value="claude_max"
                  checked={aiProvider === "claude_max"}
                  onChange={() => setAiProvider("claude_max")}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-800">Claude Max (OAuth)</span>
              </label>
              <label className="border border-gray-200 rounded-lg px-3 py-2 flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="ai-provider"
                  value="claude_api"
                  checked={aiProvider === "claude_api"}
                  onChange={() => setAiProvider("claude_api")}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-800">Claude API Key</span>
              </label>
            </div>
          </div>

          {aiProvider === "claude_max" ? (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Claude Max OAuth Token
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="password"
                  value={claudeMaxToken}
                  onChange={(event) => setClaudeMaxToken(event.target.value)}
                  placeholder="sk-ant-oat01-..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  autoComplete="off"
                />
                <button
                  onClick={() => void handlePasteToken("claude_max")}
                  type="button"
                  className="inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Paste</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Claude API Key
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={(event) => setClaudeApiKey(event.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  autoComplete="off"
                />
                <button
                  onClick={() => void handlePasteToken("claude_api")}
                  type="button"
                  className="inline-flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Paste</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Claude Model
            </label>
            <select
              value={claudeModel}
              onChange={(event) => setClaudeModel(event.target.value)}
              className="w-full md:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
            >
              {CLAUDE_MODEL_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {selectedToken && (
            <p className="text-xs text-gray-500">
              Active token: <span className="font-mono">{maskToken(selectedToken)}</span>
            </p>
          )}

          {aiMessage && (
            <div
              className={`text-sm ${
                aiMessage.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {aiMessage.text}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void handleSaveAiProviderSettings()}
              disabled={isSavingAiSettings}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {isSavingAiSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>

            <button
              onClick={() => void handleTestAiSettings()}
              disabled={isTestingAiSettings}
              type="button"
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-60"
            >
              {isTestingAiSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <span>Test</span>
              )}
            </button>
          </div>
        </div>
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

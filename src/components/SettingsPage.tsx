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
    if (!aiSettings || aiSettingsInitialized) return;
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

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

  const formatScopes = (scopes: string[]) => {
    const scopeDescriptions: Record<string, string> = {
      openid: "Basic sign-in",
      profile: "Profile information",
      offline_access: "Offline access",
      "User.Read": "Read user profile",
      "Mail.Read": "Read emails",
      "Mail.Send": "Send emails",
      "Calendars.ReadWrite": "Read and write calendar",
      "Team.ReadBasic.All": "Read Teams information",
      "Channel.ReadBasic.All": "Read channel information",
      "ChannelMessage.Read.All": "Read channel messages",
      "ChannelMessage.Send": "Send channel messages",
      "Files.ReadWrite": "Read and write files",
    };
    return scopes.map((scope) => scopeDescriptions[scope] || scope);
  };

  const maskToken = (token: string) => {
    if (token.length <= 15) return token;
    return `${token.slice(0, 15)}...`;
  };

  const handlePasteToken = async (provider: AIProvider) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is not available in this browser.");
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) throw new Error("Clipboard is empty.");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToTest, provider: aiProvider, model: claudeModel }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Token test failed.");
      setAiMessage({ type: "success", text: "Connection test succeeded." });
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

  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div
      className={`rounded-xl p-6 ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {children}
    </div>
  );

  const SectionHeader = ({
    icon: Icon,
    title,
    right,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    right?: React.ReactNode;
  }) => (
    <div className="mb-5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <span style={{ color: "var(--text-ghost)" }}>
          <Icon className="h-5 w-5" />
        </span>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
      </div>
      {right}
    </div>
  );

  const InfoRow = ({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) => (
    <div className="flex justify-between py-1.5">
      <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={valueStyle ?? { color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}
        >
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Manage your integrations and preferences
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <SectionHeader icon={User} title="User Profile" />
        <div className="space-y-0">
          <InfoRow label="Name" value={account.name || "Not provided"} />
          <InfoRow label="Email" value={account.username ?? ""} />
          <InfoRow label="Account created" value={user ? formatDate(user.createdAt) : "Loading..."} />
        </div>
      </Card>

      {/* Microsoft 365 Integration */}
      <Card>
        <SectionHeader
          icon={Shield}
          title="Microsoft 365 Integration"
          right={
            msConnection ? (
              isTokenExpired ? (
                <div className="flex items-center space-x-1.5" style={{ color: "var(--warning)" }}>
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Token expired</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5" style={{ color: "var(--success)" }}>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )
            ) : (
              <div className="flex items-center space-x-1.5" style={{ color: "var(--text-ghost)" }}>
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Not connected</span>
              </div>
            )
          }
        />

        {msConnection ? (
          <div className="space-y-5">
            <div className="space-y-0">
              <InfoRow label="Connection email" value={msConnection.email} />
              {msConnection.displayName && <InfoRow label="Display name" value={msConnection.displayName} />}
              <InfoRow label="Last updated" value={formatDate(msConnection.updatedAt)} />
              <InfoRow
                label="Token expires"
                value={`${formatDate(msConnection.expiresAt)}${isTokenExpired ? " (Expired)" : ""}`}
                valueStyle={{ color: isTokenExpired ? "var(--error)" : "var(--text-primary)" }}
              />
            </div>

            {/* Permissions */}
            <div>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Granted Permissions
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {formatScopes(allScopes).map((scope, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: "var(--success)" }} />
                    <span>{scope}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              {isTokenExpired && (
                <button
                  onClick={() => {
                    alert("Please sign out and sign back in to refresh your connection.");
                  }}
                  className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150"
                  style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Connection</span>
                </button>
              )}
              <button
                onClick={handleDisconnectMicrosoft}
                disabled={isDisconnecting}
                className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 disabled:opacity-50"
                style={{ background: "var(--error-bg)", color: "var(--error)" }}
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDisconnecting ? "Disconnecting..." : "Disconnect"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12" style={{ color: "var(--text-ghost)" }} />
            <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Not Connected
            </h3>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              Connect your Microsoft 365 account to enable the operator features.
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-ghost)" }}>
              Sign out and sign back in to connect your Microsoft account.
            </p>
          </div>
        )}
      </Card>

      {/* AI Provider */}
      <Card>
        <SectionHeader
          icon={Bot}
          title="AI Provider"
          right={
            <div className="flex items-center space-x-2" style={{ color: isProviderConfigured ? "var(--success)" : "var(--text-ghost)" }}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: isProviderConfigured ? "var(--success)" : "var(--border)" }}
              />
              <span className="text-sm font-medium">{isProviderConfigured ? "Connected" : "Not configured"}</span>
            </div>
          }
        />

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Provider
            </label>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { value: "claude_max" as const, label: "Claude Max (OAuth)" },
                { value: "claude_api" as const, label: "Claude API Key" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center space-x-3 rounded-lg px-4 py-3 transition-colors duration-150"
                  style={{
                    background: aiProvider === opt.value ? "var(--accent-bg)" : "var(--bg-muted)",
                    border: `1px solid ${aiProvider === opt.value ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  <input
                    type="radio"
                    name="ai-provider"
                    value={opt.value}
                    checked={aiProvider === opt.value}
                    onChange={() => setAiProvider(opt.value)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {aiProvider === "claude_max" ? (
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Claude Max OAuth Token
              </label>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  type="password"
                  value={claudeMaxToken}
                  onChange={(event) => setClaudeMaxToken(event.target.value)}
                  placeholder="sk-ant-oat01-..."
                  className="focus-ring flex-1 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  autoComplete="off"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-ring)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
                <button
                  onClick={() => void handlePasteToken("claude_max")}
                  type="button"
                  className="inline-flex items-center justify-center space-x-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <ClipboardPaste className="h-4 w-4" />
                  <span>Paste</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Claude API Key
              </label>
              <div className="flex flex-col gap-2 md:flex-row">
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={(event) => setClaudeApiKey(event.target.value)}
                  placeholder="sk-ant-..."
                  className="focus-ring flex-1 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  autoComplete="off"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-ring)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                />
                <button
                  onClick={() => void handlePasteToken("claude_api")}
                  type="button"
                  className="inline-flex items-center justify-center space-x-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150"
                  style={{
                    background: "var(--bg-muted)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <ClipboardPaste className="h-4 w-4" />
                  <span>Paste</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Claude Model
            </label>
            <select
              value={claudeModel}
              onChange={(event) => setClaudeModel(event.target.value)}
              className="focus-ring w-full rounded-lg px-4 py-2.5 text-sm transition-colors duration-150 md:w-auto"
              style={{
                background: "var(--bg-muted)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {CLAUDE_MODEL_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {selectedToken && (
            <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
              Active token: <span className="font-mono">{maskToken(selectedToken)}</span>
            </p>
          )}

          {aiMessage && (
            <div
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{
                background: aiMessage.type === "success" ? "var(--success-bg)" : "var(--error-bg)",
                color: aiMessage.type === "success" ? "var(--success)" : "var(--error)",
              }}
            >
              {aiMessage.text}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void handleSaveAiProviderSettings()}
              disabled={isSavingAiSettings}
              type="button"
              className="inline-flex items-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-dark)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
            >
              {isSavingAiSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
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
              className="inline-flex items-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-bg)"; }}
            >
              {isTestingAiSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <span>Test</span>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Capabilities Overview */}
      <Card>
        <SectionHeader icon={Settings} title="Available Capabilities" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { icon: Mail, label: "Email Management", desc: "Read, send, and summarize emails", color: "var(--accent)" },
            { icon: Calendar, label: "Calendar Access", desc: "Read and create calendar events", color: "var(--success)" },
            { icon: Users, label: "Teams Integration", desc: "Read and post to Teams channels", color: "#8B5CF6" },
            { icon: FileText, label: "Document Generation", desc: "Create Word, Excel, and PowerPoint files", color: "var(--warning)" },
          ].map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.label}
                className="flex items-start space-x-3 rounded-lg p-3"
                style={{ background: "var(--bg-muted)" }}
              >
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: cap.color }} />
                <div>
                  <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {cap.label}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {cap.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <SectionHeader icon={Key} title="Data & Privacy" />
        <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>Your data is processed securely and is not shared with third parties</p>
          <p>Microsoft credentials are encrypted and stored securely</p>
          <p>You can disconnect your account and delete your data at any time</p>
          <p>Generated documents are saved to your OneDrive/SharePoint</p>
        </div>
      </Card>
    </div>
  );
}

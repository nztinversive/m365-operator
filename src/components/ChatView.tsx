"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useMutation, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Send,
  LogOut,
  Mail,
  Calendar,
  Loader2,
  Bot,
  User,
  Sparkles,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  ShieldX,
  X,
  RotateCcw,
} from "lucide-react";

interface ChatViewProps {
  account: AccountInfo;
  onLogout: () => void;
  userId: Id<"users">;
}

interface TimelineMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

function formatJobType(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatJobStatus(job: {
  type: string;
  status: string;
  progress?: number;
  progressMessage?: string;
  error?: string;
}): string {
  const typeLabel = formatJobType(job.type);
  if (job.status === "queued") return `Queued: ${typeLabel}`;
  if (job.status === "running") {
    const progress = typeof job.progress === "number" ? ` (${job.progress}%)` : "";
    const detail = job.progressMessage ? ` - ${job.progressMessage}` : "";
    return `Running: ${typeLabel}${progress}${detail}`;
  }
  if (job.status === "waiting_approval") return `Waiting for approval: ${typeLabel}`;
  if (job.status === "failed") return `Failed: ${typeLabel}${job.error ? ` - ${job.error}` : ""}`;
  return `Status updated: ${typeLabel}`;
}

function formatConversationTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

const assistantMarkdownClassName = [
  "text-sm leading-relaxed",
  "[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold sm:[&_h1]:text-2xl",
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold sm:[&_h2]:text-xl",
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold sm:[&_h3]:text-lg",
  "[&_h1]:text-[var(--text-primary)] [&_h2]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)]",
  "[&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_a]:text-[var(--accent-light)] [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-[var(--accent)]",
  "[&_code]:rounded-md [&_code]:bg-[rgba(255,255,255,0.06)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:p-3 [&_pre]:text-xs",
  "[&_pre]:bg-[rgba(0,0,0,0.3)] [&_pre]:border [&_pre]:border-[rgba(255,255,255,0.04)]",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs sm:[&_table]:text-sm",
  "[&_th]:border [&_th]:border-[rgba(255,255,255,0.08)] [&_th]:bg-[rgba(255,255,255,0.04)] [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left sm:[&_th]:px-3 sm:[&_th]:py-2",
  "[&_td]:border [&_td]:border-[rgba(255,255,255,0.06)] [&_td]:px-2 [&_td]:py-1.5 sm:[&_td]:px-3 sm:[&_td]:py-2",
  "[&_tbody_tr:nth-child(even)]:bg-[rgba(255,255,255,0.02)]",
].join(" ");

export function ChatView({ account, onLogout, userId }: ChatViewProps) {
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const conversations = useQuery(api.conversations.list, { userId });
  const createConversation = useMutation(api.conversations.create);
  const updateConversationTitle = useMutation(api.conversations.updateTitle);

  const messages = useQuery(
    api.messages.getMessages,
    activeConversationId
      ? { userId, conversationId: activeConversationId }
      : { userId }
  );
  const jobs = useQuery(
    api.jobs.getJobs,
    activeConversationId
      ? { userId, conversationId: activeConversationId }
      : { userId }
  );

  const addMessage = useMutation(api.messages.addMessage);
  const createJob = useMutation(api.jobs.createJob);
  const pendingApprovals = useQuery(api.approvals.getPendingApprovals, { userId });
  const approveAction = useMutation(api.approvals.approveAction);
  const rejectAction = useMutation(api.approvals.rejectAction);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0]._id);
    }
  }, [conversations, activeConversationId]);

  const activeJob = useMemo(() => {
    if (!jobs) return null;
    const runningJob = jobs.find((job) => job.status === "running");
    if (runningJob) return runningJob;
    return jobs.find((job) => job.status === "queued") ?? null;
  }, [jobs]);

  const timeline = useMemo<TimelineMessage[]>(() => {
    const persistedMessages: TimelineMessage[] = (messages ?? []).map((message) => ({
      id: message._id,
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
    }));

    const assistantMessageJobIds = new Set(
      (messages ?? [])
        .filter((message) => message.role === "assistant" && message.jobId)
        .map((message) => message.jobId)
    );

    const completedJobFallbacks: TimelineMessage[] = (jobs ?? [])
      .filter((job) => {
        const response = job.output?.response;
        return (
          job.status === "completed" &&
          typeof response === "string" &&
          response.trim().length > 0 &&
          !assistantMessageJobIds.has(job._id)
        );
      })
      .map((job) => ({
        id: `job-output-${job._id}`,
        role: "assistant" as const,
        content: job.output.response,
        timestamp: job.completedAt ?? job.updatedAt,
      }));

    const liveJobMessages: TimelineMessage[] = (jobs ?? [])
      .filter(
        (job) =>
          job.status !== "completed" &&
          job.status !== "queued" &&
          job.status !== "running"
      )
      .map((job) => ({
        id: `job-status-${job._id}`,
        role: (job.status === "failed" ? "assistant" : "system") as "assistant" | "system",
        content: formatJobStatus(job),
        timestamp: job.updatedAt,
      }));

    return [...persistedMessages, ...completedJobFallbacks, ...liveJobMessages].sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [jobs, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeJob, isSubmitting, timeline]);

  const handleRetry = async (jobId: string) => {
    const failedJob = jobs?.find((j) => j._id === jobId);
    if (!failedJob || !failedJob.input?.message || !activeConversationId) return;

    const originalMessage = failedJob.input.message as string;
    setIsSubmitting(true);
    try {
      const newJobId = await createJob({
        userId,
        conversationId: activeConversationId,
        type: failedJob.type,
        input: { message: originalMessage },
      });

      await addMessage({
        userId,
        conversationId: activeConversationId,
        jobId: newJobId,
        role: "user",
        content: originalMessage,
      });
    } catch (error) {
      console.error("Failed to retry job:", error);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleNewConversation = async () => {
    try {
      const id = await createConversation({ userId, title: "New conversation" });
      setActiveConversationId(id);
      setSidebarOpen(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSend = async (prompt?: string, forceNewConversation?: boolean) => {
    const text = (prompt ?? input).trim();
    if (!text || isSubmitting) return;

    setInput("");
    setIsSubmitting(true);

    try {
      let convId = activeConversationId;
      if (!convId || forceNewConversation) {
        convId = await createConversation({ userId, title: "New conversation" });
        setActiveConversationId(convId);
      }

      const jobId = await createJob({
        userId,
        conversationId: convId,
        type: "chat",
        input: { message: text },
      });

      await addMessage({
        userId,
        conversationId: convId,
        jobId,
        role: "user",
        content: text,
      });

      const currentConv = conversations?.find((c) => c._id === convId);
      if (currentConv && currentConv.title === "New conversation") {
        const title = text.length > 50 ? text.substring(0, 47) + "..." : text;
        await updateConversationTitle({ id: convId, title });
      }
    } catch (error) {
      console.error("Failed to queue message/job:", error);
      try {
        await addMessage({
          userId,
          conversationId: activeConversationId ?? undefined,
          role: "system",
          content: "I could not queue that request. Please try again in a moment.",
        });
      } catch (innerError) {
        console.error("Failed to save error message:", innerError);
      }
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full" style={{ background: "var(--bg-base)" }}>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
        } fixed inset-y-0 left-0 z-30 w-72 transition-transform duration-200 lg:static lg:z-auto ${
          sidebarOpen ? "lg:w-64" : ""
        }`}
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex h-full flex-col">
          <div
            className="flex items-center justify-between px-3 py-3"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-tertiary)" }}
            >
              Conversations
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                className="rounded-lg p-1.5 transition-all duration-200"
                style={{ color: "var(--text-tertiary)" }}
                title="New conversation"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--glass-bg-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 transition-all duration-200 lg:hidden"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {conversations?.map((conv) => (
              <button
                key={conv._id}
                onClick={() => {
                  setActiveConversationId(conv._id);
                  setSidebarOpen(false);
                }}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-all duration-150"
                style={
                  activeConversationId === conv._id
                    ? { background: "var(--glass-bg-strong)", color: "var(--text-primary)" }
                    : { color: "var(--text-tertiary)" }
                }
                onMouseEnter={(e) => {
                  if (activeConversationId !== conv._id) {
                    e.currentTarget.style.background = "var(--glass-bg)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeConversationId !== conv._id) {
                    e.currentTarget.style.background = "";
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }
                }}
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{conv.title}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-ghost)" }}>
                    {formatConversationTime(conv.updatedAt)}
                  </p>
                </div>
              </button>
            ))}

            {conversations?.length === 0 && (
              <div className="px-3 py-6 text-center text-xs" style={{ color: "var(--text-ghost)" }}>
                No conversations yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3"
          style={{
            background: "rgba(18, 19, 26, 0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-1.5 transition-all duration-200"
              style={{ color: "var(--text-tertiary)" }}
              title={sidebarOpen ? "Close sidebar" : "Open conversations"}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--glass-bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>

            <div
              className="hidden h-8 w-8 items-center justify-center rounded-lg sm:flex"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                boxShadow: "0 2px 8px var(--accent-glow)",
              }}
            >
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                M365 Operator
              </h1>
              <p className="text-[11px]" style={{ color: "var(--text-ghost)" }}>
                {account.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 sm:px-3"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                boxShadow: "0 2px 8px var(--accent-glow)",
              }}
              title="New conversation"
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.3)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px var(--accent-glow)";
                e.currentTarget.style.transform = "";
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </header>

        {/* Quick action buttons */}
        <div
          className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-none sm:px-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
        >
          {[
            { label: "Emails", icon: Mail, prompt: "Summarize my unread emails" },
            { label: "Calendar", icon: Calendar, prompt: "What's on my calendar today?" },
            {
              label: "Briefing",
              icon: Sparkles,
              prompt: "Give me a full morning briefing: read my unread emails, check today's calendar, and compile everything into a clear summary.",
            },
            {
              label: "Deck",
              icon: null,
              emoji: "\u{1F4CA}",
              prompt: "Create a weekly status deck as a PowerPoint presentation. Include: wins this week, blockers, key metrics, and next steps.",
            },
            {
              label: "Tracker",
              icon: null,
              emoji: "\u{1F4CB}",
              prompt: "Create an Excel tracker with my action items from recent emails. Include columns for task, owner, deadline, and status.",
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => void handleSend(action.prompt, true)}
                disabled={isSubmitting}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-40"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "var(--glass-bg-hover)";
                    e.currentTarget.style.borderColor = "var(--glass-border-hover)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--glass-bg)";
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {Icon ? <Icon className="h-3 w-3" /> : <span>{action.emoji}</span>}
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 scrollbar-thin sm:space-y-4 sm:px-4 sm:py-4">
          {timeline.length === 0 && (
            <div className="flex gap-3 animate-fade-in">
              <div
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--accent-bg)", color: "var(--accent-light)" }}
              >
                <Bot className="h-4 w-4" />
              </div>
              <div
                className="max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%]"
                style={{
                  background: "var(--glass-bg-strong)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                Welcome! Ask me about your email, calendar, or request a briefing.
              </div>
            </div>
          )}

          {timeline.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role !== "user" && (
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl sm:h-7 sm:w-7"
                  style={
                    message.role === "assistant"
                      ? { background: "var(--accent-bg)", color: "var(--accent-light)" }
                      : { background: "var(--glass-bg)", color: "var(--text-ghost)" }
                  }
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 sm:py-3 ${
                  message.role === "system" ? "text-xs italic" : ""
                }`}
                style={
                  message.role === "user"
                    ? {
                        background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                        color: "white",
                        boxShadow: "0 2px 8px var(--accent-glow)",
                      }
                    : message.role === "system"
                    ? { background: "var(--glass-bg)", color: "var(--text-ghost)" }
                    : {
                        background: "var(--glass-bg-strong)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }
                }
              >
                {message.role === "assistant" ? (
                  <div className={assistantMarkdownClassName}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                    {message.id.startsWith("job-status-") &&
                      (() => {
                        const jobId = message.id.replace("job-status-", "");
                        const job = jobs?.find((j) => j._id === jobId);
                        if (job?.status !== "failed") return null;
                        return (
                          <button
                            onClick={() => void handleRetry(jobId)}
                            disabled={isSubmitting}
                            className="mt-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50"
                            style={{
                              background: "var(--error-bg)",
                              color: "var(--error)",
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </button>
                        );
                      })()}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>

              {message.role === "user" && (
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl sm:h-7 sm:w-7"
                  style={{ background: "var(--glass-bg-strong)", color: "var(--text-secondary)" }}
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>
          ))}

          {(isSubmitting || activeJob) && (
            <div className="flex gap-2 sm:gap-3">
              <div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl sm:h-7 sm:w-7"
                style={{ background: "var(--accent-bg)" }}
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" style={{ color: "var(--accent-light)" }} />
              </div>
              <div
                className="animate-pulse rounded-2xl px-4 py-3 text-sm"
                style={{
                  background: "var(--glass-bg-strong)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {isSubmitting
                    ? "Processing..."
                    : activeJob?.status === "running"
                    ? "Agent is thinking..."
                    : "Processing..."}
                </span>
                {typeof activeJob?.progress === "number" && (
                  <span className="ml-1" style={{ color: "var(--text-tertiary)" }}>
                    ({activeJob.progress}%)
                  </span>
                )}
                {activeJob?.progressMessage && (
                  <span className="ml-1" style={{ color: "var(--text-ghost)" }}>
                    - {activeJob.progressMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pending approval cards */}
          {pendingApprovals &&
            pendingApprovals.length > 0 &&
            pendingApprovals.map((approval: any) => (
              <div key={approval._id} className="flex gap-2 sm:gap-3">
                <div
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl sm:h-7 sm:w-7"
                  style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[80%]"
                  style={{
                    background: "rgba(251, 191, 36, 0.04)",
                    border: "1px solid rgba(251, 191, 36, 0.15)",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--warning)" }}
                  >
                    Approval Required
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {approval.description}
                  </p>
                  {approval.details && (
                    <div
                      className="mt-2 rounded-xl p-2.5 text-xs"
                      style={{
                        background: "var(--glass-bg)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {approval.details.to && (
                        <p>
                          <span style={{ color: "var(--text-secondary)" }}>To:</span>{" "}
                          {approval.details.to}
                        </p>
                      )}
                      {approval.details.subject && (
                        <p>
                          <span style={{ color: "var(--text-secondary)" }}>Subject:</span>{" "}
                          {approval.details.subject}
                        </p>
                      )}
                      {approval.details.body && (
                        <p className="mt-1 line-clamp-3">
                          {typeof approval.details.body === "string"
                            ? approval.details.body
                            : approval.details.body?.content?.substring(0, 200)}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await approveAction({ approvalId: approval._id });
                        } catch (err) {
                          console.error("Approve failed:", err);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                      style={{
                        background: "var(--success)",
                        boxShadow: "0 2px 8px rgba(52, 211, 153, 0.2)",
                      }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await rejectAction({ approvalId: approval._id });
                        } catch (err) {
                          console.error("Reject failed:", err);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                      style={{
                        background: "var(--error)",
                        boxShadow: "0 2px 8px rgba(251, 113, 133, 0.2)",
                      }}
                    >
                      <ShieldX className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-3 py-3 sm:px-4 sm:py-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
          <div className="mx-auto flex max-w-3xl gap-2.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSend();
                }
              }}
              placeholder="Ask about emails, calendar, or request a briefing..."
              disabled={isSubmitting}
              className="focus-ring flex-1 rounded-2xl px-4 py-2.5 text-sm transition-all duration-200 disabled:opacity-40 sm:py-3"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--glass-border)";
                e.currentTarget.style.boxShadow = "";
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={isSubmitting || !input.trim()}
              className="rounded-2xl p-2.5 text-white transition-all duration-200 disabled:opacity-30 sm:p-3"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                boxShadow: "0 2px 8px var(--accent-glow)",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && input.trim()) {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.3)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px var(--accent-glow)";
                e.currentTarget.style.transform = "";
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useMutation, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Mail,
  Calendar,
  Sparkles,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  ShieldX,
  X,
  RotateCcw,
  ArrowUp,
  FileSpreadsheet,
  Presentation,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";

/* ─── Types ─── */

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

/* ─── Helpers ─── */

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
    const progress =
      typeof job.progress === "number" ? ` (${job.progress}%)` : "";
    const detail = job.progressMessage ? ` \u2014 ${job.progressMessage}` : "";
    return `Running: ${typeLabel}${progress}${detail}`;
  }
  if (job.status === "waiting_approval")
    return `Waiting for approval: ${typeLabel}`;
  if (job.status === "failed")
    return `Failed: ${typeLabel}${job.error ? ` \u2014 ${job.error}` : ""}`;
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
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ─── Markdown classes ─── */

const mdClasses = [
  "text-[13.5px] leading-[1.7]",
  "[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mb-2.5 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:mb-2 [&_h3]:mt-3.5 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_h1]:text-[var(--text-primary)] [&_h2]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)]",
  "[&_p]:my-2.5 [&_p]:first:mt-0 [&_p]:last:mb-0",
  "[&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1 [&_li]:pl-0.5",
  "[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:decoration-[var(--accent)]/30 [&_a]:underline-offset-2 [&_a]:transition-colors hover:[&_a]:decoration-[var(--accent)]",
  "[&_code]:rounded-md [&_code]:bg-[var(--bg-muted)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-[var(--text-secondary)] [&_code]:font-mono",
  "[&_pre]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:text-[12px] [&_pre]:leading-relaxed",
  "[&_pre]:bg-[#1a1b26] [&_pre]:text-[#c0caf5] [&_pre]:border [&_pre]:border-[#2a2b3d]",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:font-mono",
  "[&_table]:my-3.5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "[&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--bg-muted)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[var(--text-tertiary)]",
  "[&_td]:border [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-[var(--text-secondary)] [&_blockquote]:italic",
  "[&_hr]:my-5 [&_hr]:border-[var(--border)]",
  "[&_strong]:font-semibold [&_strong]:text-[var(--text-primary)]",
].join(" ");

/* ─── Quick actions for empty state ─── */

const QUICK_ACTIONS = [
  {
    label: "Summarize emails",
    description: "Get a digest of your unread messages",
    icon: Mail,
    prompt: "Summarize my unread emails",
    color: "#3B82F6",
    colorBg: "rgba(59, 130, 246, 0.06)",
  },
  {
    label: "Today's schedule",
    description: "See what's on your calendar",
    icon: Calendar,
    prompt: "What's on my calendar today?",
    color: "#10B981",
    colorBg: "rgba(16, 185, 129, 0.06)",
  },
  {
    label: "Morning briefing",
    description: "Emails, calendar & priorities combined",
    icon: Sparkles,
    prompt:
      "Give me a full morning briefing: read my unread emails, check today's calendar, and compile everything into a clear summary.",
    color: "#7C3AED",
    colorBg: "rgba(124, 58, 237, 0.06)",
  },
  {
    label: "Status deck",
    description: "Generate a weekly status PowerPoint",
    icon: Presentation,
    prompt:
      "Create a weekly status deck as a PowerPoint presentation. Include: wins this week, blockers, key metrics, and next steps.",
    color: "#F59E0B",
    colorBg: "rgba(245, 158, 11, 0.06)",
  },
  {
    label: "Action tracker",
    description: "Excel tracker from email action items",
    icon: FileSpreadsheet,
    prompt:
      "Create an Excel tracker with my action items from recent emails. Include columns for task, owner, deadline, and status.",
    color: "#EF4444",
    colorBg: "rgba(239, 68, 68, 0.06)",
  },
  {
    label: "Draft a reply",
    description: "Help compose an email response",
    icon: Zap,
    prompt:
      "Show me my most recent unread emails and help me draft replies to the important ones.",
    color: "#06B6D4",
    colorBg: "rgba(6, 182, 212, 0.06)",
  },
];

/* ─── Component ─── */

export function ChatView({ account: _account, onLogout: _onLogout, userId }: ChatViewProps) {
  const [activeConversationId, setActiveConversationId] =
    useState<Id<"conversations"> | null>(null);
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
  const pendingApprovals = useQuery(api.approvals.getPendingApprovals, {
    userId,
  });
  const approveAction = useMutation(api.approvals.approveAction);
  const rejectAction = useMutation(api.approvals.rejectAction);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-select first conversation
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0]._id);
    }
  }, [conversations, activeConversationId]);

  const activeJob = useMemo(() => {
    if (!jobs) return null;
    return (
      jobs.find((job) => job.status === "running") ??
      jobs.find((job) => job.status === "queued") ??
      null
    );
  }, [jobs]);

  const timeline = useMemo<TimelineMessage[]>(() => {
    const persistedMessages: TimelineMessage[] = (messages ?? []).map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      timestamp: m.createdAt,
    }));

    const assistantMessageJobIds = new Set(
      (messages ?? [])
        .filter((m) => m.role === "assistant" && m.jobId)
        .map((m) => m.jobId)
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
        role: (job.status === "failed" ? "assistant" : "system") as
          | "assistant"
          | "system",
        content: formatJobStatus(job),
        timestamp: job.updatedAt,
      }));

    return [
      ...persistedMessages,
      ...completedJobFallbacks,
      ...liveJobMessages,
    ].sort((a, b) => a.timestamp - b.timestamp);
  }, [jobs, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeJob, isSubmitting, timeline]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleRetry = async (jobId: string) => {
    const failedJob = jobs?.find((j) => j._id === jobId);
    if (!failedJob || !failedJob.input?.message || !activeConversationId)
      return;

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
      textareaRef.current?.focus();
    }
  };

  const handleNewConversation = async () => {
    try {
      const id = await createConversation({
        userId,
        title: "New conversation",
      });
      setActiveConversationId(id);
      setSidebarOpen(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSend = async (
    prompt?: string,
    forceNewConversation?: boolean
  ) => {
    const text = (prompt ?? input).trim();
    if (!text || isSubmitting) return;

    setInput("");
    setIsSubmitting(true);

    try {
      let convId = activeConversationId;
      if (!convId || forceNewConversation) {
        convId = await createConversation({
          userId,
          title: "New conversation",
        });
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
        const title =
          text.length > 50 ? text.substring(0, 47) + "..." : text;
        await updateConversationTitle({ id: convId, title });
      }
    } catch (error) {
      console.error("Failed to queue message/job:", error);
      try {
        await addMessage({
          userId,
          conversationId: activeConversationId ?? undefined,
          role: "system",
          content:
            "I could not queue that request. Please try again in a moment.",
        });
      } catch (innerError) {
        console.error("Failed to save error message:", innerError);
      }
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = timeline.length === 0;

  return (
    <div className="chat-root flex h-full">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="chat-overlay fixed inset-0 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Conversation sidebar ─── */}
      <div
        className={`chat-sidebar ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
        } fixed inset-y-0 left-0 z-30 w-72 transition-all duration-200 ease-out lg:static lg:z-auto ${
          sidebarOpen ? "lg:w-[280px]" : ""
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="chat-sidebar-header flex items-center justify-between px-4 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-ghost)]">
              Conversations
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                className="chat-icon-btn rounded-lg p-1.5"
                title="New conversation"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="chat-icon-btn rounded-lg p-1.5 lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
            {conversations?.map((conv) => {
              const active = activeConversationId === conv._id;
              return (
                <button
                  key={conv._id}
                  onClick={() => {
                    setActiveConversationId(conv._id);
                    setSidebarOpen(false);
                  }}
                  className={`chat-conv-item group flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                    active ? "chat-conv-active" : ""
                  }`}
                >
                  <MessageSquare
                    className={`mt-[3px] h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                      active
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-ghost)] group-hover:text-[var(--text-tertiary)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[13px] font-medium transition-colors ${
                        active
                          ? "text-[var(--accent)]"
                          : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {conv.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-2.5 w-2.5 text-[var(--text-ghost)]" />
                      <p className="text-[11px] text-[var(--text-ghost)]">
                        {formatConversationTime(conv.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {conversations?.length === 0 && (
              <div className="px-3 py-8 text-center">
                <MessageSquare className="mx-auto mb-2 h-5 w-5 text-[var(--text-ghost)]" />
                <p className="text-[12px] text-[var(--text-ghost)]">
                  No conversations yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main chat area ─── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Minimal header */}
        <header className="chat-header flex items-center justify-between px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="chat-icon-btn rounded-lg p-1.5"
              title={sidebarOpen ? "Close sidebar" : "Open conversations"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeft className="h-[18px] w-[18px]" />
              )}
            </button>

            <div className="h-4 w-px bg-[var(--border)]" />

            <div className="flex items-center gap-2">
              <div className="chat-avatar-sm flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white">
                M
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                M365 Operator
              </span>
            </div>
          </div>

          <button
            onClick={handleNewConversation}
            className="chat-new-btn group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </header>

        {/* ─── Messages or Empty State ─── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isEmpty ? (
            /* ─── Empty state ─── */
            <div className="flex h-full flex-col items-center justify-center px-5 py-10">
              <div className="w-full max-w-2xl animate-fade-in">
                {/* Greeting */}
                <div className="mb-10 text-center">
                  <div className="chat-hero-icon mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                    <Sparkles className="h-7 w-7 text-[var(--accent)]" />
                  </div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
                    What can I help you with?
                  </h2>
                  <p className="mt-1.5 text-[14px] text-[var(--text-tertiary)]">
                    Manage emails, calendar, documents &mdash; all from one
                    place.
                  </p>
                </div>

                {/* Quick actions grid */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => void handleSend(action.prompt, true)}
                        disabled={isSubmitting}
                        className="chat-action-card group animate-slide-up rounded-xl p-4 text-left transition-all duration-200 disabled:opacity-40"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div
                          className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                          style={{
                            background: action.colorBg,
                            color: action.color,
                          }}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                          {action.label}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-tertiary)]">
                          {action.description}
                        </p>
                        <ChevronRight className="mt-2 h-3.5 w-3.5 text-[var(--text-ghost)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-tertiary)]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ─── Message feed ─── */
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
              <div className="space-y-5">
                {timeline.map((message) => (
                  <div
                    key={message.id}
                    className={`animate-fade-in ${
                      message.role === "user"
                        ? "flex justify-end"
                        : ""
                    }`}
                  >
                    {message.role === "user" ? (
                      /* ── User message ── */
                      <div className="max-w-[85%] sm:max-w-[75%]">
                        <div className="chat-user-bubble rounded-2xl rounded-br-md px-4 py-2.5">
                          <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white">
                            {message.content}
                          </div>
                        </div>
                        <p className="mt-1 text-right text-[11px] text-[var(--text-ghost)]">
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    ) : message.role === "system" ? (
                      /* ── System message ── */
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-[var(--border)]" />
                        <span className="chat-system-badge rounded-full px-3 py-1 text-[11px] font-medium">
                          {message.content}
                        </span>
                        <div className="h-px flex-1 bg-[var(--border)]" />
                      </div>
                    ) : (
                      /* ── Assistant message ── */
                      <div className="max-w-[95%] sm:max-w-[88%]">
                        <div className="chat-assistant-bubble rounded-2xl rounded-bl-md px-5 py-4">
                          <div className={mdClasses}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>

                            {/* Retry button for failed jobs */}
                            {message.id.startsWith("job-status-") &&
                              (() => {
                                const jobId = message.id.replace(
                                  "job-status-",
                                  ""
                                );
                                const job = jobs?.find(
                                  (j) => j._id === jobId
                                );
                                if (job?.status !== "failed") return null;
                                return (
                                  <button
                                    onClick={() => void handleRetry(jobId)}
                                    disabled={isSubmitting}
                                    className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150 disabled:opacity-50"
                                    style={{
                                      background: "var(--error-bg)",
                                      color: "var(--error)",
                                      border:
                                        "1px solid rgba(239, 68, 68, 0.15)",
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Retry
                                  </button>
                                );
                              })()}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text-ghost)]">
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Thinking indicator */}
                {(isSubmitting || activeJob) && (
                  <div className="animate-fade-in">
                    <div className="chat-thinking-bubble inline-flex items-center gap-3 rounded-2xl rounded-bl-md px-5 py-3.5">
                      <div className="chat-thinking-dots flex gap-1">
                        <span />
                        <span />
                        <span />
                      </div>
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                        {isSubmitting
                          ? "Processing"
                          : activeJob?.status === "running"
                          ? "Thinking"
                          : "Queued"}
                      </span>
                      {typeof activeJob?.progress === "number" && (
                        <span className="chat-progress-pill rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                          {activeJob.progress}%
                        </span>
                      )}
                    </div>
                    {activeJob?.progressMessage && (
                      <p className="mt-1.5 text-[12px] italic text-[var(--text-ghost)]">
                        {activeJob.progressMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Pending approval cards */}
                {pendingApprovals?.map((approval: any) => (
                  <div key={approval._id} className="animate-slide-up">
                    <div className="chat-approval-card overflow-hidden rounded-2xl">
                      <div className="chat-approval-header flex items-center gap-2 px-5 py-2.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em]">
                          Approval Required
                        </span>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                          {approval.description}
                        </p>
                        {approval.details && (
                          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-[12px]">
                            {approval.details.to && (
                              <p className="text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]">
                                  To:
                                </span>{" "}
                                {approval.details.to}
                              </p>
                            )}
                            {approval.details.subject && (
                              <p className="mt-1 text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]">
                                  Subject:
                                </span>{" "}
                                {approval.details.subject}
                              </p>
                            )}
                            {approval.details.body && (
                              <p className="mt-1.5 line-clamp-3 text-[var(--text-tertiary)]">
                                {typeof approval.details.body === "string"
                                  ? approval.details.body
                                  : approval.details.body?.content?.substring(
                                      0,
                                      200
                                    )}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-4 flex gap-2.5">
                          <button
                            onClick={async () => {
                              try {
                                await approveAction({
                                  approvalId: approval._id,
                                });
                              } catch (err) {
                                console.error("Approve failed:", err);
                              }
                            }}
                            className="chat-approve-btn flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition-all duration-150"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await rejectAction({
                                  approvalId: approval._id,
                                });
                              } catch (err) {
                                console.error("Reject failed:", err);
                              }
                            }}
                            className="chat-reject-btn flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-150"
                          >
                            <ShieldX className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* ─── Composer ─── */}
        <div className="chat-composer-wrap px-4 pb-4 pt-2 sm:px-5">
          <div className="chat-composer mx-auto max-w-3xl rounded-2xl">
            <div className="flex items-end gap-2 p-2.5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about emails, calendar, or request a briefing..."
                disabled={isSubmitting}
                rows={1}
                className="chat-textarea flex-1 resize-none bg-transparent px-3 py-2 text-[14px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-ghost)] disabled:opacity-40"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isSubmitting || !input.trim()}
                className="chat-send-btn flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-25"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Composer footer hints */}
            {!isEmpty && (
              <div className="flex items-center justify-between border-t border-[var(--border)]/50 px-4 py-1.5">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  {QUICK_ACTIONS.slice(0, 3).map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => void handleSend(action.prompt, true)}
                        disabled={isSubmitting}
                        className="chat-hint-chip flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 disabled:opacity-40"
                      >
                        <Icon className="h-3 w-3" />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
                <span className="hidden text-[11px] text-[var(--text-ghost)] sm:block">
                  Enter to send &middot; Shift+Enter for new line
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

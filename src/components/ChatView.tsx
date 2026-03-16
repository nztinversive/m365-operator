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
  "text-sm leading-relaxed text-gray-200",
  "[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-white sm:[&_h1]:text-2xl",
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white sm:[&_h2]:text-xl",
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white sm:[&_h3]:text-lg",
  "[&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_a]:text-blue-300 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-blue-200",
  "[&_code]:rounded [&_code]:bg-gray-700/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:text-xs",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs sm:[&_table]:text-sm",
  "[&_th]:border [&_th]:border-gray-600 [&_th]:bg-gray-700/70 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-gray-100 sm:[&_th]:px-3 sm:[&_th]:py-2",
  "[&_td]:border [&_td]:border-gray-700 [&_td]:px-2 [&_td]:py-1.5 sm:[&_td]:px-3 sm:[&_td]:py-2",
  "[&_tbody_tr:nth-child(even)]:bg-gray-800/60",
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
    <div className="flex h-full bg-gray-950">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation sidebar — overlay on mobile, inline on desktop */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
        } fixed inset-y-0 left-0 z-30 w-72 border-r border-gray-800 bg-gray-900 transition-transform duration-200 lg:static lg:z-auto ${
          sidebarOpen ? "lg:w-64" : ""
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-3">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Conversations
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                title="New conversation"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations?.map((conv) => (
              <button
                key={conv._id}
                onClick={() => {
                  setActiveConversationId(conv._id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors ${
                  activeConversationId === conv._id
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                }`}
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{conv.title}</p>
                  <p className="text-[10px] text-gray-500">
                    {formatConversationTime(conv.updatedAt)}
                  </p>
                </div>
              </button>
            ))}

            {conversations?.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-gray-500">
                No conversations yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900/50 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              title={sidebarOpen ? "Close sidebar" : "Open conversations"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>

            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-white">M365 Operator</h1>
              <p className="text-xs text-gray-500">{account.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 sm:px-3"
              title="New conversation"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </header>

        {/* Quick action buttons — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-800/50 px-3 py-2 scrollbar-none sm:px-4">
          <button
            onClick={() => void handleSend("Summarize my unread emails", true)}
            disabled={isSubmitting}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <Mail className="h-3 w-3" />
            Emails
          </button>

          <button
            onClick={() => void handleSend("What's on my calendar today?", true)}
            disabled={isSubmitting}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <Calendar className="h-3 w-3" />
            Calendar
          </button>

          <button
            onClick={() =>
              void handleSend(
                "Give me a full morning briefing: read my unread emails, check today's calendar, and compile everything into a clear summary.",
                true
              )
            }
            disabled={isSubmitting}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />
            Briefing
          </button>

          <button
            onClick={() =>
              void handleSend(
                "Create a weekly status deck as a PowerPoint presentation. Include: wins this week, blockers, key metrics, and next steps.",
                true
              )
            }
            disabled={isSubmitting}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            📊 Deck
          </button>

          <button
            onClick={() =>
              void handleSend(
                "Create an Excel tracker with my action items from recent emails. Include columns for task, owner, deadline, and status.",
                true
              )
            }
            disabled={isSubmitting}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            📋 Tracker
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
          {timeline.length === 0 && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[90%] rounded-xl bg-gray-800 px-3 py-2.5 text-sm leading-relaxed text-gray-200 sm:max-w-[80%] sm:px-4">
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
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg sm:h-7 sm:w-7 ${
                    message.role === "assistant"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 sm:py-2.5 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : message.role === "system"
                    ? "bg-gray-800/50 text-xs italic text-gray-400"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className={assistantMarkdownClassName}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                    {message.id.startsWith("job-status-") && (() => {
                      const jobId = message.id.replace("job-status-", "");
                      const job = jobs?.find((j) => j._id === jobId);
                      if (job?.status !== "failed") return null;
                      return (
                        <button
                          onClick={() => void handleRetry(jobId)}
                          disabled={isSubmitting}
                          className="mt-2 flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-600/40 disabled:opacity-50"
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
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-gray-700 sm:h-7 sm:w-7">
                  <User className="h-3.5 w-3.5 text-gray-300 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>
          ))}

          {(isSubmitting || activeJob) && (
            <div className="flex gap-2 sm:gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/20 sm:h-7 sm:w-7">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 sm:h-4 sm:w-4" />
              </div>
              <div className="animate-pulse rounded-xl bg-gray-800 px-3 py-2 text-sm text-gray-300 sm:px-4 sm:py-2.5">
                <span className="font-medium text-gray-200">
                  {isSubmitting
                    ? "Processing..."
                    : activeJob?.status === "running"
                    ? "Agent is thinking..."
                    : "Processing..."}
                </span>
                {typeof activeJob?.progress === "number" && (
                  <span className="ml-1 text-gray-400">({activeJob.progress}%)</span>
                )}
                {activeJob?.progressMessage && (
                  <span className="ml-1 text-gray-500">
                    - {activeJob.progressMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pending approval cards */}
          {pendingApprovals && pendingApprovals.length > 0 && pendingApprovals.map((approval: any) => (
            <div key={approval._id} className="flex gap-2 sm:gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-amber-600/20 text-amber-400 sm:h-7 sm:w-7">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="max-w-[85%] rounded-xl border border-amber-600/30 bg-amber-950/30 px-3 py-3 sm:max-w-[80%] sm:px-4">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-400">
                  Approval Required
                </p>
                <p className="mt-1 text-sm text-gray-200">
                  {approval.description}
                </p>
                {approval.details && (
                  <div className="mt-2 rounded-lg bg-gray-800/50 p-2 text-xs text-gray-400">
                    {approval.details.to && <p><span className="text-gray-300">To:</span> {approval.details.to}</p>}
                    {approval.details.subject && <p><span className="text-gray-300">Subject:</span> {approval.details.subject}</p>}
                    {approval.details.body && <p className="mt-1 line-clamp-3">{typeof approval.details.body === 'string' ? approval.details.body : approval.details.body?.content?.substring(0, 200)}</p>}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => {
                      try { await approveAction({ approvalId: approval._id }); } catch (err) { console.error("Approve failed:", err); }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      try { await rejectAction({ approvalId: approval._id }); } catch (err) { console.error("Reject failed:", err); }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
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
        <div className="border-t border-gray-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="mx-auto flex max-w-3xl gap-2">
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
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:opacity-50 sm:px-4 sm:py-2.5"
            />

            <button
              onClick={() => void handleSend()}
              disabled={isSubmitting || !input.trim()}
              className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 sm:p-2.5"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  if (job.status === "queued") {
    return `Queued: ${typeLabel}`;
  }

  if (job.status === "running") {
    const progress = typeof job.progress === "number" ? ` (${job.progress}%)` : "";
    const detail = job.progressMessage ? ` - ${job.progressMessage}` : "";
    return `Running: ${typeLabel}${progress}${detail}`;
  }

  if (job.status === "waiting_approval") {
    return `Waiting for approval: ${typeLabel}`;
  }

  if (job.status === "failed") {
    return `Failed: ${typeLabel}${job.error ? ` - ${job.error}` : ""}`;
  }

  return `Status updated: ${typeLabel}`;
}

const assistantMarkdownClassName = [
  "text-sm leading-relaxed text-gray-200",
  "[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-white",
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white",
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white",
  "[&_p]:my-2",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-1",
  "[&_a]:text-blue-300 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-blue-200",
  "[&_code]:rounded [&_code]:bg-gray-700/60 [&_code]:px-1 [&_code]:py-0.5",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse",
  "[&_th]:border [&_th]:border-gray-600 [&_th]:bg-gray-700/70 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-gray-100",
  "[&_td]:border [&_td]:border-gray-700 [&_td]:px-3 [&_td]:py-2",
  "[&_tbody_tr:nth-child(even)]:bg-gray-800/60",
].join(" ");

export function ChatView({ account, onLogout, userId }: ChatViewProps) {
  const messages = useQuery(api.messages.getMessages, { userId });
  const jobs = useQuery(api.jobs.getJobs, { userId });

  const addMessage = useMutation(api.messages.addMessage);
  const createJob = useMutation(api.jobs.createJob);

  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeJob = useMemo(() => {
    if (!jobs) {
      return null;
    }

    const runningJob = jobs.find((job) => job.status === "running");
    if (runningJob) {
      return runningJob;
    }

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
        role: "assistant",
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
        role: job.status === "failed" ? "assistant" : "system",
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

  const handleSend = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || isSubmitting) {
      return;
    }

    setInput("");
    setIsSubmitting(true);

    try {
      const jobId = await createJob({
        userId,
        type: "chat",
        input: {
          message: text,
        },
      });

      await addMessage({
        userId,
        jobId,
        role: "user",
        content: text,
      });
    } catch (error) {
      console.error("Failed to queue message/job:", error);

      try {
        await addMessage({
          userId,
          role: "system",
          content:
            "I could not queue that request. Please try again in a moment.",
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
    <div className="flex h-screen flex-col bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">M365 Operator</h1>
            <p className="text-xs text-gray-500">{account.username}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </header>

      <div className="flex gap-2 border-b border-gray-800/50 px-4 py-2">
        <button
          onClick={() => void handleSend("Summarize my unread emails")}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          <Mail className="h-3 w-3" />
          Emails
        </button>

        <button
          onClick={() => void handleSend("What's on my calendar today?")}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          <Calendar className="h-3 w-3" />
          Calendar
        </button>

        <button
          onClick={() => void handleSend("Give me a full morning briefing: read my unread emails, check today's calendar, and compile everything into a clear summary.")}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          Morning Briefing
        </button>

        <button
          onClick={() => void handleSend("Create a weekly status deck as a PowerPoint presentation. Include: wins this week, blockers, key metrics, and next steps.")}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          📊 Status Deck
        </button>

        <button
          onClick={() => void handleSend("Create an Excel tracker with my action items from recent emails. Include columns for task, owner, deadline, and status.")}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          📋 Excel Tracker
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {timeline.length === 0 && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[80%] rounded-xl bg-gray-800 px-4 py-2.5 text-sm leading-relaxed text-gray-200">
              Welcome! Ask me about your email, calendar, or request a briefing.
            </div>
          </div>
        )}

        {timeline.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role !== "user" && (
              <div
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                  message.role === "assistant"
                    ? "bg-blue-600/20 text-blue-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
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
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>

            {message.role === "user" && (
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-700">
                <User className="h-4 w-4 text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {(isSubmitting || activeJob) && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            </div>
            <div className="rounded-xl bg-gray-800 px-4 py-2.5 text-sm text-gray-300 animate-pulse">
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
                <span className="ml-1 text-gray-500">- {activeJob.progressMessage}</span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-800 px-4 py-3">
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
            placeholder="Ask about your emails, calendar, or request a briefing..."
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />

          <button
            onClick={() => void handleSend()}
            disabled={isSubmitting || !input.trim()}
            className="rounded-lg bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

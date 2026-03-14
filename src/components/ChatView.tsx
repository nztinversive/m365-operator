"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useMutation, useQuery } from "convex/react";
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

export function ChatView({ account, onLogout, userId }: ChatViewProps) {
  const messages = useQuery(api.messages.getMessages, { userId });
  const jobs = useQuery(api.jobs.getJobs, { userId });

  const addMessage = useMutation(api.messages.addMessage);
  const createJob = useMutation(api.jobs.createJob);

  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveJob = useMemo(() => {
    if (!jobs) return false;
    return jobs.some(
      (job) =>
        job.status === "queued" ||
        job.status === "running" ||
        job.status === "waiting_approval"
    );
  }, [jobs]);

  const timeline = useMemo<TimelineMessage[]>(() => {
    const persistedMessages: TimelineMessage[] = (messages ?? []).map((message) => ({
      id: message._id,
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
    }));

    const liveJobMessages: TimelineMessage[] = (jobs ?? [])
      .filter((job) => job.status !== "completed")
      .map((job) => ({
        id: `job-status-${job._id}`,
        role: job.status === "failed" ? "assistant" : "system",
        content: formatJobStatus(job),
        timestamp: job.updatedAt,
      }));

    return [...persistedMessages, ...liveJobMessages].sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [jobs, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

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
          onClick={() => void handleSend("Morning briefing")}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          Briefing
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
              <div className="whitespace-pre-wrap">
                {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={`${message.id}-${i}`} className="font-semibold text-white">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }

                  return <span key={`${message.id}-${i}`}>{part}</span>;
                })}
              </div>
            </div>

            {message.role === "user" && (
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-700">
                <User className="h-4 w-4 text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {(isSubmitting || hasActiveJob) && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            </div>
            <div className="rounded-xl bg-gray-800 px-4 py-2.5 text-sm text-gray-400">
              {isSubmitting ? "Queueing request..." : "Agent is working..."}
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

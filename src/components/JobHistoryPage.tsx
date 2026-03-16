"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface JobHistoryPageProps {
  userId: Id<"users">;
}

type StatusFilter = "all" | "completed" | "failed" | "running" | "queued" | "waiting_approval";

const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  completed: { bg: "bg-green-500/20 text-green-400", dot: "bg-green-400" },
  failed: { bg: "bg-red-500/20 text-red-400", dot: "bg-red-400" },
  waiting_approval: { bg: "bg-yellow-500/20 text-yellow-400", dot: "bg-yellow-400" },
  running: { bg: "bg-blue-500/20 text-blue-400", dot: "bg-blue-400" },
  queued: { bg: "bg-gray-500/20 text-gray-400", dot: "bg-gray-400" },
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  waiting_approval: "Waiting",
  running: "Running",
  queued: "Queued",
};

const JOB_TYPE_ICONS: Record<string, string> = {
  chat: "💬",
  email_send: "📧",
  email_read: "📨",
  calendar_create: "📅",
  calendar_read: "🗓️",
  file_create: "📄",
  file_read: "📂",
  search: "🔍",
};

const PAGE_SIZE = 25;

export function JobHistoryPage({ userId }: JobHistoryPageProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const result = useQuery(api.jobs.getJobsPaginated, { userId, limit });
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const jobs = result?.jobs;
  const hasMore = result?.hasMore ?? false;

  const filteredJobs = jobs?.filter(
    (job: any) => filter === "all" || job.status === filter
  );

  // Compute status counts for filter badges
  const statusCounts = jobs?.reduce(
    (acc: Record<string, number>, job: any) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const formatDuration = (start: number, end?: number) => {
    if (!end && end !== 0) return "—";
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const formatJobType = (type: string) => {
    const icon = JOB_TYPE_ICONS[type] || "⚙️";
    const label = type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return `${icon} ${label}`;
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "running", label: "Running" },
    { value: "failed", label: "Failed" },
    { value: "waiting_approval", label: "Waiting" },
    { value: "queued", label: "Queued" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job History</h1>
          <p className="mt-1 text-sm text-gray-400">
            All agent jobs and their results
            {jobs && (
              <span className="ml-2 text-gray-500">
                · {jobs.length} job{jobs.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const count =
            f.value === "all"
              ? jobs?.length
              : statusCounts?.[f.value] || 0;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === f.value
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-gray-800/80 text-gray-400 hover:bg-gray-700/80 hover:text-gray-200"
              }`}
            >
              {f.label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs ${
                    filter === f.value
                      ? "bg-blue-500/40 text-blue-100"
                      : "bg-gray-700 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Jobs List */}
      {filteredJobs === undefined ? (
        <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
          <span className="text-sm">Loading jobs…</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
          <div className="text-3xl mb-3">
            {filter === "all" ? "📭" : "🔍"}
          </div>
          <p className="text-gray-400">
            {filter === "all"
              ? "No jobs yet — try sending a message!"
              : `No ${filter.replace("_", " ")} jobs`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filteredJobs.map((job: any) => {
              const style = STATUS_STYLES[job.status] || {
                bg: "bg-gray-700 text-gray-400",
                dot: "bg-gray-500",
              };
              const isExpanded = expandedJob === job._id;

              return (
                <div
                  key={job._id}
                  className={`rounded-xl border transition-all ${
                    isExpanded
                      ? "border-gray-600 bg-gray-900 shadow-lg shadow-black/20"
                      : "border-gray-800 bg-gray-900/70 hover:border-gray-700 hover:bg-gray-900"
                  }`}
                >
                  <button
                    onClick={() =>
                      setExpandedJob(isExpanded ? null : job._id)
                    }
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Status badge with dot */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${style.bg}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${style.dot} ${
                            job.status === "running" ? "animate-pulse" : ""
                          }`}
                        />
                        {STATUS_LABELS[job.status] || job.status}
                      </span>

                      {/* Job type */}
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatJobType(job.type)}
                      </span>

                      {/* Job description / message preview */}
                      <span className="truncate text-sm text-gray-200">
                        {job.conversationTitle
                          ? job.conversationTitle
                          : job.input?.message
                            ? job.input.message.substring(0, 80)
                            : job.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pl-4 text-xs text-gray-500 whitespace-nowrap">
                      <span className="hidden sm:inline">
                        {formatDuration(job.createdAt, job.completedAt)}
                      </span>
                      <span>{formatTime(job.createdAt)}</span>
                      <svg
                        className={`h-4 w-4 text-gray-600 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-4">
                      {/* Metadata row */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                        <span>
                          Created: {formatTime(job.createdAt)}
                        </span>
                        {job.completedAt && (
                          <span>
                            Duration:{" "}
                            {formatDuration(job.createdAt, job.completedAt)}
                          </span>
                        )}
                        {job.conversationTitle && (
                          <span>
                            Conversation: {job.conversationTitle}
                          </span>
                        )}
                        <span className="font-mono text-gray-600">
                          {job._id}
                        </span>
                      </div>

                      {/* Input */}
                      {job.input?.message && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Input
                          </h4>
                          <div className="rounded-lg bg-gray-800/60 p-3">
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">
                              {job.input.message}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Output */}
                      {job.output?.response && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Response
                          </h4>
                          <div className="rounded-lg bg-gray-800/60 p-3">
                            <p className="max-h-72 overflow-auto text-sm text-gray-300 whitespace-pre-wrap">
                              {job.output.response.substring(0, 3000)}
                              {job.output.response.length > 3000 && (
                                <span className="text-gray-500"> …truncated</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Tools Used */}
                      {job.output?.toolsUsed?.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Tools Used
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {job.output.toolsUsed.map(
                              (tool: any, i: number) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-400"
                                >
                                  🔧 {tool.name}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Files */}
                      {job.output?.files?.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Generated Files
                          </h4>
                          <div className="space-y-1">
                            {job.output.files.map((file: any, i: number) => (
                              <a
                                key={i}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
                              >
                                📄 {file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {job.error && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-red-500">
                            Error
                          </h4>
                          <div className="rounded-lg bg-red-950/30 border border-red-900/30 p-3">
                            <p className="text-sm text-red-400 font-mono">
                              {job.error}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                className="rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white"
              >
                Load more jobs
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

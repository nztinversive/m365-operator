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
  completed: { bg: "var(--success-bg)", dot: "var(--success)" },
  failed: { bg: "var(--error-bg)", dot: "var(--error)" },
  waiting_approval: { bg: "var(--warning-bg)", dot: "var(--warning)" },
  running: { bg: "var(--accent-bg)", dot: "var(--accent)" },
  queued: { bg: "var(--bg-muted)", dot: "var(--text-ghost)" },
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  completed: "var(--success)",
  failed: "var(--error)",
  waiting_approval: "var(--warning)",
  running: "var(--accent)",
  queued: "var(--text-ghost)",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  waiting_approval: "Waiting",
  running: "Running",
  queued: "Queued",
};

const JOB_TYPE_ICONS: Record<string, string> = {
  chat: "\u{1F4AC}",
  email_send: "\u{1F4E7}",
  email_read: "\u{1F4E8}",
  calendar_create: "\u{1F4C5}",
  calendar_read: "\u{1F5D3}\uFE0F",
  file_create: "\u{1F4C4}",
  file_read: "\u{1F4C2}",
  search: "\u{1F50D}",
};

const PAGE_SIZE = 25;

export function JobHistoryPage({ userId }: JobHistoryPageProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const result = useQuery(api.jobs.getJobsPaginated, { userId, limit });
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const jobs = result?.jobs;
  const hasMore = result?.hasMore ?? false;

  const filteredJobs = jobs?.filter((job: any) => filter === "all" || job.status === filter);

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
    if (!end && end !== 0) return "\u2014";
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
    const icon = JOB_TYPE_ICONS[type] || "\u2699\uFE0F";
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
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}
          >
            Job History
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            All agent jobs and their results
            {jobs && (
              <span className="ml-2" style={{ color: "var(--text-ghost)" }}>
                · {jobs.length} job{jobs.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const count = f.value === "all" ? jobs?.length : statusCounts?.[f.value] || 0;
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150"
              style={
                isActive
                  ? {
                      background: "var(--accent)",
                      color: "white",
                    }
                  : {
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-tertiary)",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--border-hover)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }
              }}
            >
              {f.label}
              {count !== undefined && count > 0 && (
                <span
                  className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={
                    isActive
                      ? { background: "rgba(255,255,255,0.2)", color: "white" }
                      : { background: "var(--bg-muted)", color: "var(--text-ghost)" }
                  }
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
        <div className="flex items-center justify-center gap-3 py-12" style={{ color: "var(--text-ghost)" }}>
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-b-transparent"
            style={{ borderColor: "var(--accent)", borderBottomColor: "transparent" }}
          />
          <span className="text-sm">Loading jobs...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="mb-3 text-3xl">{filter === "all" ? "\u{1F4ED}" : "\u{1F50D}"}</div>
          <p style={{ color: "var(--text-tertiary)" }}>
            {filter === "all" ? "No jobs yet — try sending a message!" : `No ${filter.replace("_", " ")} jobs`}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filteredJobs.map((job: any) => {
              const statusStyle = STATUS_STYLES[job.status] || { bg: "var(--bg-muted)", dot: "var(--text-ghost)" };
              const statusColor = STATUS_TEXT_COLORS[job.status] || "var(--text-ghost)";
              const isExpanded = expandedJob === job._id;

              return (
                <div
                  key={job._id}
                  className="rounded-xl transition-all duration-150"
                  style={{
                    background: "var(--bg-surface)",
                    border: `1px solid ${isExpanded ? "var(--border-hover)" : "var(--border)"}`,
                    boxShadow: isExpanded ? "var(--shadow-md)" : "var(--shadow-sm)",
                  }}
                >
                  <button
                    onClick={() => setExpandedJob(isExpanded ? null : job._id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Status badge */}
                      <span
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: statusStyle.bg, color: statusColor }}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${job.status === "running" ? "animate-pulse" : ""}`}
                          style={{ background: statusStyle.dot }}
                        />
                        {STATUS_LABELS[job.status] || job.status}
                      </span>

                      {/* Job type */}
                      <span className="whitespace-nowrap text-xs" style={{ color: "var(--text-ghost)" }}>
                        {formatJobType(job.type)}
                      </span>

                      {/* Job description */}
                      <span className="truncate text-sm" style={{ color: "var(--text-secondary)" }}>
                        {job.conversationTitle
                          ? job.conversationTitle
                          : job.input?.message
                            ? job.input.message.substring(0, 80)
                            : job.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 whitespace-nowrap pl-4 text-xs" style={{ color: "var(--text-ghost)" }}>
                      <span className="hidden sm:inline">{formatDuration(job.createdAt, job.completedAt)}</span>
                      <span>{formatTime(job.createdAt)}</span>
                      <svg
                        className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: "var(--text-ghost)" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      className="animate-slide-up space-y-4 px-4 pb-4 pt-3"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      {/* Metadata */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "var(--text-ghost)" }}>
                        <span>Created: {formatTime(job.createdAt)}</span>
                        {job.completedAt && <span>Duration: {formatDuration(job.createdAt, job.completedAt)}</span>}
                        {job.conversationTitle && <span>Conversation: {job.conversationTitle}</span>}
                        <span className="font-mono" style={{ color: "var(--text-ghost)" }}>
                          {job._id}
                        </span>
                      </div>

                      {/* Input */}
                      {job.input?.message && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-ghost)" }}>
                            Input
                          </h4>
                          <div
                            className="rounded-lg p-3"
                            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
                          >
                            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text-secondary)" }}>
                              {job.input.message}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Output */}
                      {job.output?.response && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-ghost)" }}>
                            Response
                          </h4>
                          <div
                            className="rounded-lg p-3"
                            style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
                          >
                            <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm scrollbar-thin" style={{ color: "var(--text-secondary)" }}>
                              {job.output.response.substring(0, 3000)}
                              {job.output.response.length > 3000 && (
                                <span style={{ color: "var(--text-ghost)" }}> ...truncated</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Tools Used */}
                      {job.output?.toolsUsed?.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-ghost)" }}>
                            Tools Used
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {job.output.toolsUsed.map((tool: any, i: number) => (
                              <span
                                key={i}
                                className="rounded-md px-2.5 py-1 text-xs"
                                style={{ background: "var(--bg-muted)", color: "var(--text-tertiary)" }}
                              >
                                {tool.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Files */}
                      {job.output?.files?.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-ghost)" }}>
                            Generated Files
                          </h4>
                          <div className="space-y-1">
                            {job.output.files.map((file: any, i: number) => (
                              <a
                                key={i}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm transition-colors duration-150"
                                style={{ color: "var(--accent)" }}
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {job.error && (
                        <div>
                          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--error)" }}>
                            Error
                          </h4>
                          <div
                            className="rounded-lg p-3"
                            style={{
                              background: "var(--error-bg)",
                              border: "1px solid rgba(239, 68, 68, 0.15)",
                            }}
                          >
                            <p className="font-mono text-sm" style={{ color: "var(--error)" }}>
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
                className="rounded-lg px-6 py-2.5 text-sm font-medium transition-colors duration-150"
                style={{
                  background: "var(--bg-surface)",
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
                Load more jobs
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

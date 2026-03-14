"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface JobHistoryPageProps {
  userId: Id<"users">;
}

type StatusFilter = "all" | "completed" | "failed" | "running" | "queued" | "waiting_approval";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  running: "bg-yellow-500/20 text-yellow-400",
  queued: "bg-blue-500/20 text-blue-400",
  waiting_approval: "bg-orange-500/20 text-orange-400",
};

export function JobHistoryPage({ userId }: JobHistoryPageProps) {
  const jobs = useQuery(api.jobs.getJobs, { userId });
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const filteredJobs = jobs?.filter(
    (job: any) => filter === "all" || job.status === filter
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const formatDuration = (start: number, end?: number) => {
    const ms = (end || Date.now()) - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "running", label: "Running" },
    { value: "failed", label: "Failed" },
    { value: "waiting_approval", label: "Waiting" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Job History</h1>
        <p className="mt-1 text-sm text-gray-400">
          All agent jobs and their results
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {filteredJobs === undefined ? (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
          Loading…
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
          {filter === "all" ? "No jobs yet — try sending a message!" : `No ${filter} jobs`}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredJobs.map((job: any) => (
            <div
              key={job._id}
              className="rounded-lg border border-gray-800 bg-gray-900 transition hover:border-gray-700"
            >
              <button
                onClick={() =>
                  setExpandedJob(expandedJob === job._id ? null : job._id)
                }
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[job.status] || "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {job.status.replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium text-gray-200">
                    {job.type === "chat"
                      ? job.input?.message?.substring(0, 80) || "Chat"
                      : job.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDuration(job.createdAt, job.completedAt)}</span>
                  <span>{formatTime(job.createdAt)}</span>
                  <span className="text-gray-600">
                    {expandedJob === job._id ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {expandedJob === job._id && (
                <div className="border-t border-gray-800 p-4 space-y-3">
                  {/* Input */}
                  {job.input?.message && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                        Input
                      </h4>
                      <p className="text-sm text-gray-300">{job.input.message}</p>
                    </div>
                  )}

                  {/* Output */}
                  {job.output?.response && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                        Response
                      </h4>
                      <p className="max-h-60 overflow-auto text-sm text-gray-300 whitespace-pre-wrap">
                        {job.output.response.substring(0, 2000)}
                        {job.output.response.length > 2000 && "…"}
                      </p>
                    </div>
                  )}

                  {/* Tools Used */}
                  {job.output?.toolsUsed?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                        Tools Used
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {job.output.toolsUsed.map((tool: any, i: number) => (
                          <span
                            key={i}
                            className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                          >
                            🔧 {tool.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {job.output?.files?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                        Generated Files
                      </h4>
                      <div className="space-y-1">
                        {job.output.files.map((file: any, i: number) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
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
                      <h4 className="text-xs font-semibold uppercase text-red-500 mb-1">
                        Error
                      </h4>
                      <p className="text-sm text-red-400">{job.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

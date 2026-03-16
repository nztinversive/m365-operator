"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface ApprovalsPageProps {
  userId: Id<"users">;
}

export function ApprovalsPage({ userId }: ApprovalsPageProps) {
  const pendingApprovals = useQuery(api.approvals.getPendingApprovals, { userId });
  const approvalHistory = useQuery(api.approvals.getApprovalHistory, { userId });
  const approveAction = useMutation(api.approvals.approveAction);
  const rejectAction = useMutation(api.approvals.rejectAction);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const handleApprove = async (approvalId: Id<"approvals">) => {
    setProcessing((prev) => new Set(prev).add(approvalId));
    try {
      await approveAction({ approvalId });
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  const handleReject = async (approvalId: Id<"approvals">) => {
    setProcessing((prev) => new Set(prev).add(approvalId));
    try {
      await rejectAction({ approvalId });
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
        <p className="mt-1 text-sm text-gray-400">
          Review and approve actions before they execute
        </p>
      </div>

      {/* Pending Approvals */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-200">
          Pending{" "}
          {pendingApprovals && pendingApprovals.length > 0 && (
            <span className="ml-2 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-sm text-orange-400">
              {pendingApprovals.length}
            </span>
          )}
        </h2>

        {pendingApprovals === undefined ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
            Loading…
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
            No pending approvals — you&apos;re all clear ✓
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((approval: any) => (
              <div
                key={approval._id}
                className="rounded-lg border border-orange-500/30 bg-gray-900 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                        Needs Approval
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTime(approval._creationTime)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-medium text-white">
                      {formatToolName(approval.action)}
                    </h3>
                    {approval.details && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-800 p-3 text-xs text-gray-300">
                        {JSON.stringify(approval.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleApprove(approval._id)}
                    disabled={processing.has(approval._id)}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
                  >
                    {processing.has(approval._id) ? "Approving…" : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(approval._id)}
                    disabled={processing.has(approval._id)}
                    className="rounded-md bg-red-600/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {processing.has(approval._id) ? "Rejecting…" : "✗ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-200">History</h2>
        {approvalHistory === undefined ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
            Loading…
          </div>
        ) : approvalHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No approval history yet</p>
        ) : (
          <div className="space-y-2">
            {approvalHistory.map((approval: any) => (
              <div
                key={approval._id}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      approval.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {approval.status === "approved" ? "Approved" : "Rejected"}
                  </span>
                  <span className="text-sm text-gray-300">
                    {formatToolName(approval.action)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {approval.decidedAt ? formatTime(approval.decidedAt) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

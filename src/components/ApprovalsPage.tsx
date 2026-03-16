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
    <div className="animate-fade-in space-y-8">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}
        >
          Approvals
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Review and approve actions before they execute
        </p>
      </div>

      {/* Pending Approvals */}
      <section>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Pending{" "}
          {pendingApprovals && pendingApprovals.length > 0 && (
            <span
              className="ml-2 rounded-full px-2.5 py-0.5 text-sm font-medium"
              style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
            >
              {pendingApprovals.length}
            </span>
          )}
        </h2>

        {pendingApprovals === undefined ? (
          <div className="flex items-center gap-2" style={{ color: "var(--text-ghost)" }}>
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"
              style={{ borderColor: "var(--accent)", borderBottomColor: "transparent" }}
            />
            Loading...
          </div>
        ) : pendingApprovals.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-ghost)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            No pending approvals — you&apos;re all clear
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((approval: any) => (
              <div
                key={approval._id}
                className="animate-slide-up rounded-xl p-5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md px-2.5 py-1 text-xs font-medium"
                        style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                      >
                        Needs Approval
                      </span>
                      <span className="text-sm" style={{ color: "var(--text-ghost)" }}>
                        {formatTime(approval._creationTime)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-medium" style={{ color: "var(--text-primary)" }}>
                      {formatToolName(approval.action)}
                    </h3>
                    {approval.details && (
                      <pre
                        className="mt-2 max-h-40 overflow-auto rounded-lg p-3 text-xs scrollbar-thin"
                        style={{
                          background: "var(--bg-muted)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {JSON.stringify(approval.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleApprove(approval._id)}
                    disabled={processing.has(approval._id)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-50"
                    style={{ background: "var(--success)" }}
                  >
                    {processing.has(approval._id) ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(approval._id)}
                    disabled={processing.has(approval._id)}
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:opacity-50"
                    style={{ background: "var(--error-bg)", color: "var(--error)" }}
                  >
                    {processing.has(approval._id) ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          History
        </h2>
        {approvalHistory === undefined ? (
          <div className="flex items-center gap-2" style={{ color: "var(--text-ghost)" }}>
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"
              style={{ borderColor: "var(--accent)", borderBottomColor: "transparent" }}
            />
            Loading...
          </div>
        ) : approvalHistory.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-ghost)" }}>
            No approval history yet
          </p>
        ) : (
          <div className="space-y-2">
            {approvalHistory.map((approval: any) => (
              <div
                key={approval._id}
                className="flex items-center justify-between rounded-lg p-3.5 transition-colors duration-150"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-medium"
                    style={
                      approval.status === "approved"
                        ? { background: "var(--success-bg)", color: "var(--success)" }
                        : { background: "var(--error-bg)", color: "var(--error)" }
                    }
                  >
                    {approval.status === "approved" ? "Approved" : "Rejected"}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {formatToolName(approval.action)}
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-ghost)" }}>
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

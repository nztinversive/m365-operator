"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Users,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ApprovalQueueProps {
  userId: Id<"users">;
}

type ApprovalDetails = Record<string, unknown>;
type PendingApproval = Omit<Doc<"approvals">, "details"> & {
  details?: ApprovalDetails;
};

function getString(details: ApprovalDetails, key: string): string | undefined {
  const value = details[key];
  return typeof value === "string" ? value : undefined;
}

function getStringArray(details: ApprovalDetails, key: string): string[] | undefined {
  const value = details[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function ApprovalQueue({ userId }: ApprovalQueueProps) {
  const approvals = useQuery(api.approvals.listPending, { userId });
  const approveAction = useMutation(api.approvals.approve);
  const rejectAction = useMutation(api.approvals.reject);

  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  const handleApprove = async (approvalId: Id<"approvals">) => {
    try {
      setProcessingApproval(approvalId);
      await approveAction({ id: approvalId });
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleReject = async (approvalId: Id<"approvals">) => {
    try {
      setProcessingApproval(approvalId);
      await rejectAction({ id: approvalId });
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setProcessingApproval(null);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes("email")) return <Mail className="w-4 h-4" />;
    if (action.includes("teams") || action.includes("channel")) return <Users className="w-4 h-4" />;
    if (action.includes("file") || action.includes("document")) return <FileText className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const formatActionType = (action: string) => {
    return action
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < 60) {
      return `${Math.floor(diffMinutes)} minutes ago`;
    }

    const diffHours = diffMinutes / 60;
    if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`;
    }

    const diffDays = diffHours / 24;
    return `${Math.floor(diffDays)} days ago`;
  };

  const renderApprovalDetails = (approval: PendingApproval) => {
    if (!approval.details) return null;

    const details = approval.details;

    if (approval.action === "send_email") {
      return (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
        >
          <h4 className="font-medium text-sm mb-2" style={{ color: "var(--text-primary)" }}>Email Preview</h4>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div><strong>To:</strong> {getString(details, "to") || "Unknown recipient"}</div>
            {getStringArray(details, "cc")?.length ? (
              <div><strong>CC:</strong> {getStringArray(details, "cc")!.join(", ")}</div>
            ) : getString(details, "cc") ? (
              <div><strong>CC:</strong> {getString(details, "cc")}</div>
            ) : null}
            <div><strong>Subject:</strong> {getString(details, "subject") || "No subject"}</div>
            <div style={{ borderTop: "1px solid var(--border)" }} className="pt-2 mt-2">
              <strong>Body:</strong>
              <div
                className="mt-1 max-h-32 overflow-y-auto scrollbar-thin"
                style={{ color: "var(--text-secondary)" }}
                dangerouslySetInnerHTML={{
                  __html: getString(details, "body") || getString(details, "bodyPreview") || "",
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (approval.action === "post_teams") {
      return (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
        >
          <h4 className="font-medium text-sm mb-2" style={{ color: "var(--text-primary)" }}>Teams Message Preview</h4>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div><strong>Channel:</strong> {getString(details, "channelName") || getString(details, "channel") || "Unknown channel"}</div>
            {getString(details, "subject") && <div><strong>Subject:</strong> {getString(details, "subject")}</div>}
            <div style={{ borderTop: "1px solid var(--border)" }} className="pt-2 mt-2">
              <strong>Message:</strong>
              <div className="mt-1 max-h-32 overflow-y-auto scrollbar-thin" style={{ color: "var(--text-secondary)" }}>
                {getString(details, "message") || getString(details, "content")}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (approval.action === "create_calendar_event") {
      return (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
        >
          <h4 className="font-medium text-sm mb-2" style={{ color: "var(--text-primary)" }}>Calendar Event Preview</h4>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div><strong>Title:</strong> {getString(details, "subject") || getString(details, "title") || "Untitled event"}</div>
            <div><strong>Start:</strong> {new Date(getString(details, "start") || "").toLocaleString()}</div>
            <div><strong>End:</strong> {new Date(getString(details, "end") || "").toLocaleString()}</div>
            {getStringArray(details, "attendees")?.length && (
              <div><strong>Attendees:</strong> {getStringArray(details, "attendees")!.join(", ")}</div>
            )}
            {getString(details, "location") && <div><strong>Location:</strong> {getString(details, "location")}</div>}
          </div>
        </div>
      );
    }

    if (approval.action === "overwrite_file") {
      return (
        <div
          className="mt-3 p-3 rounded-lg"
          style={{ background: "var(--warning-bg)", border: "1px solid rgba(245, 158, 11, 0.2)" }}
        >
          <h4 className="font-medium text-sm mb-2 flex items-center" style={{ color: "var(--text-primary)" }}>
            <AlertTriangle className="w-4 h-4 mr-1" style={{ color: "var(--warning)" }} />
            File Overwrite Warning
          </h4>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div><strong>File:</strong> {getString(details, "fileName") || getString(details, "name") || "Unknown file"}</div>
            <div><strong>Location:</strong> {getString(details, "location") || getString(details, "path") || "Unknown path"}</div>
            <div className="text-xs mt-2" style={{ color: "var(--warning)" }}>
              This action will replace the existing file. This cannot be undone.
            </div>
          </div>
        </div>
      );
    }

    // Generic details display
    return (
      <div
        className="mt-3 p-3 rounded-lg"
        style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
      >
        <h4 className="font-medium text-sm mb-2" style={{ color: "var(--text-primary)" }}>Details</h4>
        <pre
          className="text-xs whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin"
          style={{ color: "var(--text-secondary)" }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  };

  if (!approvals) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="w-6 h-6 animate-pulse mr-2" style={{ color: "var(--text-ghost)" }} />
        <span style={{ color: "var(--text-secondary)" }}>Loading approvals...</span>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div
        className="text-center rounded-xl p-8"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--success)" }} />
        <h3 className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>All caught up!</h3>
        <p style={{ color: "var(--text-ghost)" }}>
          No pending approvals at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          Approval Queue
        </h2>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "var(--error-bg)", color: "var(--error)" }}
        >
          {approvals.length} pending
        </span>
      </div>

      <div className="space-y-3">
        {approvals.map((approval) => {
          const pendingApproval = approval as PendingApproval;
          return (
          <div
            key={pendingApproval._id}
            className="animate-slide-up rounded-xl p-5 transition-all duration-150"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div
                  className="flex-shrink-0 mt-0.5 p-2 rounded-lg"
                  style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                >
                  {getActionIcon(pendingApproval.action)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {formatActionType(pendingApproval.action)}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                    >
                      Approval Required
                    </span>
                  </div>

                  <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                    {pendingApproval.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs" style={{ color: "var(--text-ghost)" }}>
                    <span>Requested {formatDateTime(pendingApproval.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {pendingApproval.details && (
                  <button
                    onClick={() => setExpandedApproval(
                      expandedApproval === pendingApproval._id ? null : pendingApproval._id
                    )}
                    className="p-1 transition-colors rounded-md"
                    style={{ color: "var(--text-ghost)" }}
                    title="View details"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-ghost)"; }}
                  >
                    {expandedApproval === pendingApproval._id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {expandedApproval === pendingApproval._id && renderApprovalDetails(pendingApproval)}

            <div
              className="flex items-center justify-end space-x-2 mt-4 pt-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={() => handleReject(pendingApproval._id)}
                disabled={processingApproval === pendingApproval._id}
                className="flex items-center space-x-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-50"
                style={{ background: "var(--error-bg)", color: "var(--error)" }}
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>

              <button
                onClick={() => handleApprove(pendingApproval._id)}
                disabled={processingApproval === pendingApproval._id}
                className="flex items-center space-x-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors duration-150 disabled:opacity-50"
                style={{ background: "var(--success)" }}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}

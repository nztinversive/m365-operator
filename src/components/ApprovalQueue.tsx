"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Users,
  FileText,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ApprovalQueueProps {
  userId: Id<"users">;
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

  const renderApprovalDetails = (approval: any) => {
    if (!approval.details) return null;

    const details = approval.details;

    if (approval.action === "send_email") {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-sm text-gray-900 mb-2">Email Preview</h4>
          <div className="space-y-2 text-xs">
            <div><strong>To:</strong> {details.to}</div>
            {details.cc && <div><strong>CC:</strong> {details.cc}</div>}
            <div><strong>Subject:</strong> {details.subject}</div>
            <div className="border-t pt-2 mt-2">
              <strong>Body:</strong>
              <div 
                className="mt-1 text-gray-700 max-h-32 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: details.body || details.bodyPreview }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (approval.action === "post_teams") {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-sm text-gray-900 mb-2">Teams Message Preview</h4>
          <div className="space-y-2 text-xs">
            <div><strong>Channel:</strong> {details.channelName || details.channel}</div>
            {details.subject && <div><strong>Subject:</strong> {details.subject}</div>}
            <div className="border-t pt-2 mt-2">
              <strong>Message:</strong>
              <div className="mt-1 text-gray-700 max-h-32 overflow-y-auto">
                {details.message || details.content}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (approval.action === "create_calendar_event") {
      return (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-sm text-gray-900 mb-2">Calendar Event Preview</h4>
          <div className="space-y-2 text-xs">
            <div><strong>Title:</strong> {details.subject || details.title}</div>
            <div><strong>Start:</strong> {new Date(details.start).toLocaleString()}</div>
            <div><strong>End:</strong> {new Date(details.end).toLocaleString()}</div>
            {details.attendees && (
              <div><strong>Attendees:</strong> {details.attendees.join(", ")}</div>
            )}
            {details.location && <div><strong>Location:</strong> {details.location}</div>}
          </div>
        </div>
      );
    }

    if (approval.action === "overwrite_file") {
      return (
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
            File Overwrite Warning
          </h4>
          <div className="space-y-2 text-xs">
            <div><strong>File:</strong> {details.fileName || details.name}</div>
            <div><strong>Location:</strong> {details.location || details.path}</div>
            <div className="text-yellow-700 text-xs mt-2">
              This action will replace the existing file. This cannot be undone.
            </div>
          </div>
        </div>
      );
    }

    // Generic details display
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
        <h4 className="font-medium text-sm text-gray-900 mb-2">Details</h4>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  };

  if (!approvals) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="w-6 h-6 text-gray-400 animate-pulse mr-2" />
        <span className="text-gray-600">Loading approvals...</span>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center p-8">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
        <p className="text-gray-500">
          No pending approvals at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Approval Queue</h2>
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
          {approvals.length} pending
        </span>
      </div>

      <div className="space-y-3">
        {approvals.map((approval: any) => (
          <div
            key={approval._id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 mt-0.5 p-2 bg-yellow-100 rounded-lg">
                  {getActionIcon(approval.action)}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {formatActionType(approval.action)}
                    </h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                      Approval Required
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {approval.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Requested {formatDateTime(approval.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {approval.details && (
                  <button
                    onClick={() => setExpandedApproval(
                      expandedApproval === approval._id ? null : approval._id
                    )}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View details"
                  >
                    {expandedApproval === approval._id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {expandedApproval === approval._id && renderApprovalDetails(approval)}

            <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t">
              <button
                onClick={() => handleReject(approval._id)}
                disabled={processingApproval === approval._id}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
              
              <button
                onClick={() => handleApprove(approval._id)}
                disabled={processingApproval === approval._id}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
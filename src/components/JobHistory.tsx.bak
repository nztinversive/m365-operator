"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Pause,
  Calendar,
  Mail,
  FileText,
  Users,
  Download,
  X,
} from "lucide-react";

interface JobHistoryProps {
  userId: Id<"users">;
}

export function JobHistory({ userId }: JobHistoryProps) {
  const jobs = useQuery(api.jobs.list, { userId });
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobs?.some((job) => job.status === "running")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [jobs]);

  if (!jobs) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading job history...</span>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "waiting_approval":
        return <Pause className="w-5 h-5 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("email")) return <Mail className="w-4 h-4" />;
    if (type.includes("calendar")) return <Calendar className="w-4 h-4" />;
    if (type.includes("teams")) return <Users className="w-4 h-4" />;
    if (type.includes("document")) return <FileText className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "waiting_approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const formatJobType = (type: string) => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (createdAt: number, completedAt?: number) => {
    const endTime = completedAt ?? currentTime;
    const durationMs = endTime - createdAt;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center p-8">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
        <p className="text-gray-500">
          Start a conversation to see your job history here.
        </p>
      </div>
    );
  }

  const selectedJob = selectedJobId
    ? jobs.find((job) => job._id === selectedJobId)
    : null;

  return (
    <>
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Job History</h2>
        <span className="text-sm text-gray-500">{jobs.length} total jobs</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job._id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(job.status)}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex items-center space-x-1 text-gray-600">
                      {getTypeIcon(job.type)}
                      <span className="text-sm font-medium">
                        {formatJobType(job.type)}
                      </span>
                    </div>
                    
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </div>

                  {job.progressMessage && (
                    <p className="text-sm text-gray-600 mb-2">
                      {job.progressMessage}
                    </p>
                  )}

                  {job.error && (
                    <p className="text-sm text-red-600 mb-2 bg-red-50 p-2 rounded border">
                      Error: {job.error}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Started {formatDateTime(job.createdAt)}</span>
                    <span>•</span>
                    <span>
                      Duration: {calculateDuration(job.createdAt, job.completedAt)}
                    </span>
                    {job.progress !== undefined && job.status === "running" && (
                      <>
                        <span>•</span>
                        <span>{job.progress}% complete</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {job.output && (
                  <button
                    onClick={() => setSelectedJobId(job._id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View output"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {job.status === "running" && job.progress !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatJobType(selectedJob.type)} Output
                </h3>
                <p className="text-sm text-gray-500">
                  Started {formatDateTime(selectedJob.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedJobId(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-xs text-gray-800">
                {JSON.stringify(selectedJob.output, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

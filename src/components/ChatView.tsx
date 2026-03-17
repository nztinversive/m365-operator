"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useMutation, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Mail,
  Calendar,
  Sparkles,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  ShieldX,
  X,
  RotateCcw,
  ArrowUp,
  FileSpreadsheet,
  Presentation,
  Zap,
  Clock,
  ChevronRight,
  Search,
  Pin,
  PinOff,
  Copy,
  Check,
  Download,
  FileText,
  File,
  ExternalLink,
  Inbox,
  CalendarDays,
  CheckCircle2,
  Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

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
  jobId?: string;
}

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */

function formatJobType(type: string): string {
  return type
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatJobStatus(job: {
  type: string;
  status: string;
  progress?: number;
  progressMessage?: string;
  error?: string;
}): string {
  const label = formatJobType(job.type);
  if (job.status === "queued") return `Queued: ${label}`;
  if (job.status === "running") {
    const pct = typeof job.progress === "number" ? ` (${job.progress}%)` : "";
    const msg = job.progressMessage ? ` \u2014 ${job.progressMessage}` : "";
    return `Running: ${label}${pct}${msg}`;
  }
  if (job.status === "waiting_approval") return `Waiting for approval: ${label}`;
  if (job.status === "failed") return `Failed: ${label}${job.error ? ` \u2014 ${job.error}` : ""}`;
  return `Status updated: ${label}`;
}

function formatConversationTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  docx: FileText,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  pdf: File,
};

const FILE_COLORS: Record<string, { color: string; bg: string }> = {
  docx: { color: "#2563EB", bg: "rgba(37, 99, 235, 0.08)" },
  xlsx: { color: "#16A34A", bg: "rgba(22, 163, 74, 0.08)" },
  pptx: { color: "#EA580C", bg: "rgba(234, 88, 12, 0.08)" },
  pdf: { color: "#DC2626", bg: "rgba(220, 38, 38, 0.08)" },
};

/* ═══════════════════════════════════════════════
   Markdown classes
   ═══════════════════════════════════════════════ */

const mdClasses = [
  "text-[13.5px] leading-[1.7]",
  "[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight",
  "[&_h2]:mb-2.5 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight",
  "[&_h3]:mb-2 [&_h3]:mt-3.5 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_h1]:text-[var(--text-primary)] [&_h2]:text-[var(--text-primary)] [&_h3]:text-[var(--text-primary)]",
  "[&_p]:my-2.5 [&_p]:first:mt-0 [&_p]:last:mb-0",
  "[&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1 [&_li]:pl-0.5",
  "[&_a]:text-[var(--accent)] [&_a]:underline [&_a]:decoration-[var(--accent)]/30 [&_a]:underline-offset-2 [&_a]:transition-colors hover:[&_a]:decoration-[var(--accent)]",
  "[&_code]:rounded-md [&_code]:bg-[var(--bg-muted)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:text-[var(--text-secondary)] [&_code]:font-mono",
  "[&_pre]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:text-[12px] [&_pre]:leading-relaxed",
  "[&_pre]:bg-[#1a1b26] [&_pre]:text-[#c0caf5] [&_pre]:border [&_pre]:border-[#2a2b3d]",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:font-mono",
  "[&_table]:my-3.5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px]",
  "[&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--bg-muted)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[var(--text-tertiary)]",
  "[&_td]:border [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)] [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-[var(--text-secondary)] [&_blockquote]:italic",
  "[&_hr]:my-5 [&_hr]:border-[var(--border)]",
  "[&_strong]:font-semibold [&_strong]:text-[var(--text-primary)]",
].join(" ");

/* ═══════════════════════════════════════════════
   Quick Actions
   ═══════════════════════════════════════════════ */

const QUICK_ACTIONS = [
  {
    label: "Summarize emails",
    description: "Get a digest of your unread messages",
    icon: Mail,
    prompt: "Summarize my unread emails",
    color: "#3B82F6",
    colorBg: "rgba(59, 130, 246, 0.06)",
  },
  {
    label: "Today's schedule",
    description: "See what's on your calendar",
    icon: Calendar,
    prompt: "What's on my calendar today?",
    color: "#10B981",
    colorBg: "rgba(16, 185, 129, 0.06)",
  },
  {
    label: "Morning briefing",
    description: "Emails, calendar & priorities combined",
    icon: Sparkles,
    prompt: "Give me a full morning briefing: read my unread emails, check today's calendar, and compile everything into a clear summary.",
    color: "#7C3AED",
    colorBg: "rgba(124, 58, 237, 0.06)",
  },
  {
    label: "Status deck",
    description: "Generate a weekly status PowerPoint",
    icon: Presentation,
    prompt: "Create a weekly status deck as a PowerPoint presentation. Include: wins this week, blockers, key metrics, and next steps.",
    color: "#F59E0B",
    colorBg: "rgba(245, 158, 11, 0.06)",
  },
  {
    label: "Action tracker",
    description: "Excel tracker from email action items",
    icon: FileSpreadsheet,
    prompt: "Create an Excel tracker with my action items from recent emails. Include columns for task, owner, deadline, and status.",
    color: "#EF4444",
    colorBg: "rgba(239, 68, 68, 0.06)",
  },
  {
    label: "Draft a reply",
    description: "Help compose an email response",
    icon: Zap,
    prompt: "Show me my most recent unread emails and help me draft replies to the important ones.",
    color: "#06B6D4",
    colorBg: "rgba(6, 182, 212, 0.06)",
  },
];

/* ═══════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════ */

/* ── 2. Rich email card ── */
function EmailCard({ subject, from, preview, time }: { subject: string; from: string; preview: string; time?: string }) {
  return (
    <div className="chat-rich-card group mt-2.5 rounded-xl transition-all duration-150">
      <div className="flex items-start gap-3 p-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(59, 130, 246, 0.08)" }}>
          <Inbox className="h-4 w-4 text-[#3B82F6]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{subject}</p>
            {time && <span className="flex-shrink-0 text-[11px] text-[var(--text-ghost)]">{time}</span>}
          </div>
          <p className="mt-0.5 text-[12px] font-medium text-[var(--text-tertiary)]">{from}</p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">{preview}</p>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Rich calendar card ── */
function CalendarCard({ title, time, location }: { title: string; time: string; location?: string }) {
  return (
    <div className="chat-rich-card group mt-2.5 rounded-xl transition-all duration-150">
      <div className="flex items-start gap-3 p-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(16, 185, 129, 0.08)" }}>
          <CalendarDays className="h-4 w-4 text-[#10B981]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</p>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {time}</span>
            {location && <span className="truncate">{location}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3. File attachment card ── */
function FileCard({ name, type, size, webUrl }: { name: string; type: string; size?: number; webUrl?: string }) {
  const colors = FILE_COLORS[type] ?? { color: "var(--text-tertiary)", bg: "var(--bg-muted)" };
  const Icon = FILE_ICONS[type] ?? File;

  return (
    <div className="chat-file-card group mt-2.5 flex items-center gap-3 rounded-xl p-3 transition-all duration-150">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: colors.bg }}>
        <Icon className="h-5 w-5" style={{ color: colors.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-ghost)]">
          {type.toUpperCase()}{size ? ` \u00B7 ${formatFileSize(size)}` : ""}
        </p>
      </div>
      {webUrl && (
        <a
          href={webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-file-download flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
          title="Open in OneDrive"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <button
        className="chat-file-download flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ── 5. Message hover actions ── */
function MessageActions({
  content,
  onRetry,
  showRetry = false,
  isSubmitting = false,
}: {
  content: string;
  onRetry?: () => void;
  showRetry?: boolean;
  isSubmitting?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="chat-msg-actions flex items-center gap-0.5 rounded-lg p-0.5">
      <button onClick={handleCopy} className="chat-msg-action-btn rounded-md p-1.5" title="Copy">
        {copied ? <Check className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
      </button>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          disabled={isSubmitting}
          className="chat-msg-action-btn rounded-md p-1.5 disabled:opacity-40"
          title="Retry"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ── 1. Enhanced thinking indicator ── */
function ThinkingIndicator({
  status,
  jobType,
  progress,
  progressMessage,
}: {
  status: string;
  jobType?: string;
  progress?: number;
  progressMessage?: string;
}) {
  const steps = useMemo(() => {
    const s: { label: string; status: "done" | "active" | "pending" }[] = [];

    if (status === "queued" || status === "submitting") {
      s.push({ label: "Request received", status: "active" });
      s.push({ label: "Processing", status: "pending" });
      return s;
    }

    s.push({ label: "Request received", status: "done" });

    if (progressMessage) {
      // Parse progress message for step info
      const lower = progressMessage.toLowerCase();
      if (lower.includes("email") || lower.includes("mail")) {
        s.push({ label: "Reading emails", status: "active" });
      } else if (lower.includes("calendar") || lower.includes("event")) {
        s.push({ label: "Checking calendar", status: "active" });
      } else if (lower.includes("generat") || lower.includes("creat") || lower.includes("build")) {
        s.push({ label: "Generating document", status: "active" });
      } else if (lower.includes("draft") || lower.includes("compos")) {
        s.push({ label: "Drafting response", status: "active" });
      } else if (lower.includes("analyz") || lower.includes("summar")) {
        s.push({ label: "Analyzing content", status: "active" });
      } else {
        s.push({ label: progressMessage, status: "active" });
      }
      s.push({ label: "Finishing up", status: "pending" });
    } else {
      const typeLabel = jobType ? formatJobType(jobType) : "Processing";
      s.push({ label: typeLabel, status: "active" });
      s.push({ label: "Preparing response", status: "pending" });
    }

    return s;
  }, [status, jobType, progressMessage]);

  return (
    <div className="animate-fade-in">
      <div className="chat-thinking-card rounded-2xl rounded-bl-md px-5 py-4">
        {/* Step list */}
        <div className="space-y-2.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              {step.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--success)]" />
              ) : step.status === "active" ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[var(--accent)]" />
              ) : (
                <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-[var(--border)]" />
              )}
              <span
                className={`text-[13px] ${
                  step.status === "active"
                    ? "font-medium text-[var(--text-primary)]"
                    : step.status === "done"
                    ? "text-[var(--text-tertiary)] line-through decoration-[var(--text-ghost)]"
                    : "text-[var(--text-ghost)]"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {typeof progress === "number" && (
          <div className="mt-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[var(--text-tertiary)]">Progress</span>
              <span className="text-[11px] font-semibold tabular-nums text-[var(--accent)]">{progress}%</span>
            </div>
            <div className="chat-progress-track h-1.5 overflow-hidden rounded-full">
              <div
                className="chat-progress-fill h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Content parser for rich cards ── */
function parseRichContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];

  // Try to detect email summaries
  const emailPattern = /(?:From|Sender):\s*(.+?)(?:\n|$)[\s\S]*?(?:Subject):\s*(.+?)(?:\n|$)(?:[\s\S]*?(?:Preview|Body|Summary):\s*(.+?)(?:\n\n|$))?/gi;
  const emailMatches = [...content.matchAll(emailPattern)];

  if (emailMatches.length > 0) {
    let lastIndex = 0;
    for (const match of emailMatches) {
      const before = content.slice(lastIndex, match.index);
      if (before.trim()) {
        nodes.push(
          <ReactMarkdown key={`md-${lastIndex}`} remarkPlugins={[remarkGfm]}>
            {before.trim()}
          </ReactMarkdown>
        );
      }
      nodes.push(
        <EmailCard
          key={`email-${match.index}`}
          from={match[1]?.trim() ?? "Unknown"}
          subject={match[2]?.trim() ?? "No subject"}
          preview={match[3]?.trim() ?? ""}
        />
      );
      lastIndex = (match.index ?? 0) + match[0].length;
    }
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      nodes.push(
        <ReactMarkdown key={`md-end`} remarkPlugins={[remarkGfm]}>
          {remaining.trim()}
        </ReactMarkdown>
      );
    }
    return nodes;
  }

  // Try to detect calendar events
  const calPattern = /(?:Event|Meeting|Appointment):\s*(.+?)(?:\n|$)[\s\S]*?(?:Time|When|At):\s*(.+?)(?:\n|$)(?:[\s\S]*?(?:Location|Where|Room):\s*(.+?)(?:\n|$))?/gi;
  const calMatches = [...content.matchAll(calPattern)];

  if (calMatches.length > 0) {
    let lastIndex = 0;
    for (const match of calMatches) {
      const before = content.slice(lastIndex, match.index);
      if (before.trim()) {
        nodes.push(
          <ReactMarkdown key={`md-${lastIndex}`} remarkPlugins={[remarkGfm]}>
            {before.trim()}
          </ReactMarkdown>
        );
      }
      nodes.push(
        <CalendarCard
          key={`cal-${match.index}`}
          title={match[1]?.trim() ?? ""}
          time={match[2]?.trim() ?? ""}
          location={match[3]?.trim()}
        />
      );
      lastIndex = (match.index ?? 0) + match[0].length;
    }
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      nodes.push(
        <ReactMarkdown key={`md-end`} remarkPlugins={[remarkGfm]}>
          {remaining.trim()}
        </ReactMarkdown>
      );
    }
    return nodes;
  }

  // Default: plain markdown
  return [
    <ReactMarkdown key="md-full" remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>,
  ];
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */

export function ChatView({ account: _account, onLogout: _onLogout, userId }: ChatViewProps) {
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  /* ── Convex queries & mutations ── */
  const conversations = useQuery(api.conversations.list, { userId });
  const createConversation = useMutation(api.conversations.create);
  const updateConversationTitle = useMutation(api.conversations.updateTitle);
  const togglePinned = useMutation(api.conversations.togglePinned);

  const messages = useQuery(
    api.messages.getMessages,
    activeConversationId ? { userId, conversationId: activeConversationId } : { userId }
  );
  const jobs = useQuery(
    api.jobs.getJobs,
    activeConversationId ? { userId, conversationId: activeConversationId } : { userId }
  );

  // 3. File attachments for active conversation
  const documents = useQuery(
    api.documents.list,
    activeConversationId ? { userId } : "skip"
  );

  const addMessage = useMutation(api.messages.addMessage);
  const createJob = useMutation(api.jobs.createJob);
  const pendingApprovals = useQuery(api.approvals.getPendingApprovals, { userId });
  const approveAction = useMutation(api.approvals.approveAction);
  const rejectAction = useMutation(api.approvals.rejectAction);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Auto-select first conversation ── */
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0]._id);
    }
  }, [conversations, activeConversationId]);

  /* ── 7. Sorted conversations: pinned first, then by date ── */
  const sortedConversations = useMemo(() => {
    if (!conversations) return [];
    const filtered = searchQuery
      ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : conversations;

    const pinned = filtered.filter((c) => c.pinned);
    const unpinned = filtered.filter((c) => !c.pinned);
    return [...pinned, ...unpinned];
  }, [conversations, searchQuery]);

  /* ── Active job ── */
  const activeJob = useMemo(() => {
    if (!jobs) return null;
    return jobs.find((j) => j.status === "running") ?? jobs.find((j) => j.status === "queued") ?? null;
  }, [jobs]);

  /* ── 3. Documents linked to jobs in this conversation ── */
  const conversationDocuments = useMemo(() => {
    if (!documents || !jobs) return [];
    const jobIds = new Set(jobs.map((j) => j._id));
    return documents.filter((d: any) => d.jobId && jobIds.has(d.jobId));
  }, [documents, jobs]);

  /* ── Timeline ── */
  const timeline = useMemo<TimelineMessage[]>(() => {
    const persisted: TimelineMessage[] = (messages ?? []).map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      timestamp: m.createdAt,
      jobId: m.jobId ?? undefined,
    }));

    const assistantJobIds = new Set(
      (messages ?? []).filter((m) => m.role === "assistant" && m.jobId).map((m) => m.jobId)
    );

    const fallbacks: TimelineMessage[] = (jobs ?? [])
      .filter(
        (j) =>
          j.status === "completed" &&
          typeof j.output?.response === "string" &&
          j.output.response.trim().length > 0 &&
          !assistantJobIds.has(j._id)
      )
      .map((j) => ({
        id: `job-output-${j._id}`,
        role: "assistant" as const,
        content: j.output.response,
        timestamp: j.completedAt ?? j.updatedAt,
        jobId: j._id,
      }));

    const liveStatuses: TimelineMessage[] = (jobs ?? [])
      .filter((j) => j.status !== "completed" && j.status !== "queued" && j.status !== "running")
      .map((j) => ({
        id: `job-status-${j._id}`,
        role: (j.status === "failed" ? "assistant" : "system") as "assistant" | "system",
        content: formatJobStatus(j),
        timestamp: j.updatedAt,
        jobId: j._id,
      }));

    return [...persisted, ...fallbacks, ...liveStatuses].sort((a, b) => a.timestamp - b.timestamp);
  }, [jobs, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeJob, isSubmitting, timeline]);

  /* ── Auto-resize textarea ── */
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  /* ── 8. Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        void handleNewConversation();
      }
      if (meta && e.key === "/") {
        e.preventDefault();
        setSidebarOpen((p) => !p);
      }
      if (meta && e.key === "f") {
        if (sidebarOpen) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen]);

  /* ── Handlers ── */
  const handleRetry = async (jobId: string) => {
    const failed = jobs?.find((j) => j._id === jobId);
    if (!failed?.input?.message || !activeConversationId) return;
    const msg = failed.input.message as string;
    setIsSubmitting(true);
    try {
      const nid = await createJob({ userId, conversationId: activeConversationId, type: failed.type, input: { message: msg } });
      await addMessage({ userId, conversationId: activeConversationId, jobId: nid, role: "user", content: msg });
    } catch (e) {
      console.error("Retry failed:", e);
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  };

  const handleNewConversation = async () => {
    try {
      const id = await createConversation({ userId, title: "New conversation" });
      setActiveConversationId(id);
      setSidebarOpen(false);
      textareaRef.current?.focus();
    } catch (e) {
      console.error("Create failed:", e);
    }
  };

  const handleSend = async (prompt?: string, forceNew?: boolean) => {
    const text = (prompt ?? input).trim();
    if (!text || isSubmitting) return;
    setInput("");
    setIsSubmitting(true);
    try {
      let cid = activeConversationId;
      if (!cid || forceNew) {
        cid = await createConversation({ userId, title: "New conversation" });
        setActiveConversationId(cid);
      }
      const jid = await createJob({ userId, conversationId: cid, type: "chat", input: { message: text } });
      await addMessage({ userId, conversationId: cid, jobId: jid, role: "user", content: text });
      const conv = conversations?.find((c) => c._id === cid);
      if (conv?.title === "New conversation") {
        await updateConversationTitle({ id: cid, title: text.length > 50 ? text.substring(0, 47) + "..." : text });
      }
    } catch (e) {
      console.error("Send failed:", e);
      try { await addMessage({ userId, conversationId: activeConversationId ?? undefined, role: "system", content: "I could not queue that request. Please try again in a moment." }); } catch {}
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const isEmpty = timeline.length === 0;

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */

  return (
    <div className="chat-root flex h-full">
      {/* Mobile backdrop */}
      {sidebarOpen && <div className="chat-overlay fixed inset-0 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Conversation Sidebar ─── */}
      <div
        className={`chat-sidebar ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
        } fixed inset-y-0 left-0 z-30 w-72 transition-all duration-200 ease-out lg:static lg:z-auto ${
          sidebarOpen ? "lg:w-[280px]" : ""
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="chat-sidebar-header flex items-center justify-between px-4 py-3.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-ghost)]">Conversations</span>
            <div className="flex items-center gap-1">
              <button onClick={handleNewConversation} className="chat-icon-btn rounded-lg p-1.5" title="New conversation (Ctrl+K)">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => setSidebarOpen(false)} className="chat-icon-btn rounded-lg p-1.5 lg:hidden">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 4. Search */}
          <div className="px-3 py-2">
            <div className={`chat-search-box flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all duration-150 ${searchFocused ? "chat-search-focused" : ""}`}>
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-ghost)]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search conversations..."
                className="w-full bg-transparent text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-ghost)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="chat-icon-btn rounded p-0.5">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin">
            {/* 7. Pinned section */}
            {sortedConversations.some((c) => c.pinned) && (
              <div className="mb-1 px-3 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-ghost)]">
                  <Pin className="mb-px mr-1 inline h-2.5 w-2.5" />Pinned
                </span>
              </div>
            )}

            {sortedConversations.map((conv, idx) => {
              const active = activeConversationId === conv._id;
              const prevPinned = idx > 0 && sortedConversations[idx - 1]?.pinned;
              const showUnpinnedLabel = !conv.pinned && (idx === 0 || prevPinned);

              return (
                <div key={conv._id}>
                  {showUnpinnedLabel && sortedConversations.some((c) => c.pinned) && (
                    <div className="mb-1 mt-3 px-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-ghost)]">Recent</span>
                    </div>
                  )}
                  <div className="group relative">
                    <button
                      onClick={() => { setActiveConversationId(conv._id); setSidebarOpen(false); }}
                      className={`chat-conv-item flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${active ? "chat-conv-active" : ""}`}
                    >
                      <MessageSquare
                        className={`mt-[3px] h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                          active ? "text-[var(--accent)]" : "text-[var(--text-ghost)] group-hover:text-[var(--text-tertiary)]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-medium transition-colors ${active ? "text-[var(--accent)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"}`}>
                          {conv.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-2.5 w-2.5 text-[var(--text-ghost)]" />
                          <p className="text-[11px] text-[var(--text-ghost)]">{formatConversationTime(conv.updatedAt)}</p>
                        </div>
                      </div>
                    </button>
                    {/* Pin toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); void togglePinned({ id: conv._id }); }}
                      className="chat-pin-btn absolute right-2 top-2.5 rounded-md p-1 opacity-0 transition-all duration-150 group-hover:opacity-100"
                      title={conv.pinned ? "Unpin" : "Pin"}
                    >
                      {conv.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              );
            })}

            {sortedConversations.length === 0 && (
              <div className="px-3 py-8 text-center">
                {searchQuery ? (
                  <>
                    <Search className="mx-auto mb-2 h-5 w-5 text-[var(--text-ghost)]" />
                    <p className="text-[12px] text-[var(--text-ghost)]">No results for &ldquo;{searchQuery}&rdquo;</p>
                  </>
                ) : (
                  <>
                    <MessageSquare className="mx-auto mb-2 h-5 w-5 text-[var(--text-ghost)]" />
                    <p className="text-[12px] text-[var(--text-ghost)]">No conversations yet</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Keyboard shortcut hints */}
          <div className="hidden border-t border-[var(--border)] px-4 py-2.5 lg:block">
            <div className="flex flex-col gap-1 text-[10px] text-[var(--text-ghost)]">
              <span><kbd className="chat-kbd">Ctrl+K</kbd> New chat</span>
              <span><kbd className="chat-kbd">Ctrl+/</kbd> Toggle sidebar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Chat Area ─── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="chat-header flex items-center justify-between px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="chat-icon-btn rounded-lg p-1.5" title="Toggle sidebar (Ctrl+/)">
              {sidebarOpen ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeft className="h-[18px] w-[18px]" />}
            </button>
            <div className="h-4 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2">
              <div className="chat-avatar-sm flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white">M</div>
              <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">M365 Operator</span>
            </div>
          </div>
          <button onClick={handleNewConversation} className="chat-new-btn group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-150">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </header>

        {/* ─── Messages or Empty State ─── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center px-5 py-10">
              <div className="w-full max-w-2xl animate-fade-in">
                <div className="mb-10 text-center">
                  <div className="chat-hero-icon mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                    <Sparkles className="h-7 w-7 text-[var(--accent)]" />
                  </div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">What can I help you with?</h2>
                  <p className="mt-1.5 text-[14px] text-[var(--text-tertiary)]">Manage emails, calendar, documents &mdash; all from one place.</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => void handleSend(action.prompt, true)}
                        disabled={isSubmitting}
                        className="chat-action-card group animate-slide-up rounded-xl p-4 text-left transition-all duration-200 disabled:opacity-40"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110" style={{ background: action.colorBg, color: action.color }}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{action.label}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-tertiary)]">{action.description}</p>
                        <ChevronRight className="mt-2 h-3.5 w-3.5 text-[var(--text-ghost)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--text-tertiary)]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
              <div className="space-y-5">
                {timeline.map((message) => (
                  <div key={message.id} className={`animate-fade-in ${message.role === "user" ? "flex justify-end" : ""}`}>
                    {message.role === "user" ? (
                      /* ── User message with hover actions ── */
                      <div className="chat-msg-wrap group max-w-[85%] sm:max-w-[75%]">
                        <div className="relative">
                          <div className="chat-user-bubble rounded-2xl rounded-br-md px-4 py-2.5">
                            <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white">{message.content}</div>
                          </div>
                          {/* 5. Message actions */}
                          <div className="absolute -left-10 top-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <MessageActions content={message.content} />
                          </div>
                        </div>
                        <p className="mt-1 text-right text-[11px] text-[var(--text-ghost)]">{formatMessageTime(message.timestamp)}</p>
                      </div>
                    ) : message.role === "system" ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-[var(--border)]" />
                        <span className="chat-system-badge rounded-full px-3 py-1 text-[11px] font-medium">{message.content}</span>
                        <div className="h-px flex-1 bg-[var(--border)]" />
                      </div>
                    ) : (
                      /* ── Assistant message with hover actions + rich cards ── */
                      <div className="chat-msg-wrap group max-w-[95%] sm:max-w-[88%]">
                        <div className="relative">
                          <div className="chat-assistant-bubble rounded-2xl rounded-bl-md px-5 py-4">
                            <div className={mdClasses}>
                              {/* 2. Rich content parsing */}
                              {parseRichContent(message.content)}

                              {/* 3. File attachments for this message's job */}
                              {message.jobId && conversationDocuments
                                .filter((d: any) => d.jobId === message.jobId)
                                .map((doc: any) => (
                                  <FileCard key={doc._id} name={doc.name} type={doc.type} size={doc.size} webUrl={doc.webUrl} />
                                ))}

                              {/* Retry for failed jobs */}
                              {message.id.startsWith("job-status-") && (() => {
                                const jid = message.id.replace("job-status-", "");
                                const job = jobs?.find((j) => j._id === jid);
                                if (job?.status !== "failed") return null;
                                return (
                                  <button
                                    onClick={() => void handleRetry(jid)}
                                    disabled={isSubmitting}
                                    className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150 disabled:opacity-50"
                                    style={{ background: "var(--error-bg)", color: "var(--error)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                                  >
                                    <RotateCcw className="h-3 w-3" /> Retry
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                          {/* 5. Message actions */}
                          <div className="absolute -right-10 top-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <MessageActions
                              content={message.content}
                              showRetry={message.id.startsWith("job-status-") && jobs?.find((j) => j._id === message.id.replace("job-status-", ""))?.status === "failed"}
                              onRetry={() => void handleRetry(message.id.replace("job-status-", ""))}
                              isSubmitting={isSubmitting}
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text-ghost)]">{formatMessageTime(message.timestamp)}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* 1. Enhanced thinking indicator */}
                {(isSubmitting || activeJob) && (
                  <ThinkingIndicator
                    status={isSubmitting ? "submitting" : activeJob?.status ?? "queued"}
                    jobType={activeJob?.type}
                    progress={activeJob?.progress}
                    progressMessage={activeJob?.progressMessage}
                  />
                )}

                {/* Pending approvals */}
                {pendingApprovals?.map((approval: any) => (
                  <div key={approval._id} className="animate-slide-up">
                    <div className="chat-approval-card overflow-hidden rounded-2xl">
                      <div className="chat-approval-header flex items-center gap-2 px-5 py-2.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em]">Approval Required</span>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-[13.5px] font-medium text-[var(--text-primary)]">{approval.description}</p>
                        {approval.details && (
                          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-[12px]">
                            {approval.details.to && <p className="text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">To:</span> {approval.details.to}</p>}
                            {approval.details.subject && <p className="mt-1 text-[var(--text-secondary)]"><span className="font-medium text-[var(--text-primary)]">Subject:</span> {approval.details.subject}</p>}
                            {approval.details.body && <p className="mt-1.5 line-clamp-3 text-[var(--text-tertiary)]">{typeof approval.details.body === "string" ? approval.details.body : approval.details.body?.content?.substring(0, 200)}</p>}
                          </div>
                        )}
                        <div className="mt-4 flex gap-2.5">
                          <button onClick={async () => { try { await approveAction({ approvalId: approval._id }); } catch (err) { console.error("Approve failed:", err); } }} className="chat-approve-btn flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white transition-all duration-150">
                            <ShieldCheck className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={async () => { try { await rejectAction({ approvalId: approval._id }); } catch (err) { console.error("Reject failed:", err); } }} className="chat-reject-btn flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-150">
                            <ShieldX className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* ─── Composer ─── */}
        <div className="chat-composer-wrap px-4 pb-4 pt-2 sm:px-5">
          <div className="chat-composer mx-auto max-w-3xl rounded-2xl">
            <div className="flex items-end gap-2 p-2.5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about emails, calendar, or request a briefing..."
                disabled={isSubmitting}
                rows={1}
                className="chat-textarea flex-1 resize-none bg-transparent px-3 py-2 text-[14px] leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-ghost)] disabled:opacity-40"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isSubmitting || !input.trim()}
                className="chat-send-btn flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-25"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            </div>
            {!isEmpty && (
              <div className="flex items-center justify-between border-t border-[var(--border)]/50 px-4 py-1.5">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                  {QUICK_ACTIONS.slice(0, 3).map((action) => {
                    const Icon = action.icon;
                    return (
                      <button key={action.label} onClick={() => void handleSend(action.prompt, true)} disabled={isSubmitting} className="chat-hint-chip flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 disabled:opacity-40">
                        <Icon className="h-3 w-3" /> {action.label}
                      </button>
                    );
                  })}
                </div>
                <span className="hidden text-[11px] text-[var(--text-ghost)] sm:block">Enter to send &middot; Shift+Enter for new line</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

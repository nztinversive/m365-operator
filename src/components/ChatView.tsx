"use client";

import { useState, useRef, useEffect } from "react";
import { AccountInfo } from "@azure/msal-browser";
import { useGraphClient } from "@/hooks/useGraphClient";
import { getUnreadEmails, getTodayEvents, getUserProfile } from "@/lib/graph-client";
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

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface ChatViewProps {
  account: AccountInfo;
  onLogout: () => void;
}

export function ChatView({ account, onLogout }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hey${account.name ? ` ${account.name.split(" ")[0]}` : ""}! I'm your M365 Operator. I can help you with:\n\n• **Summarize unread emails** — I'll pull your inbox and break it down\n• **Today's calendar** — See what's on your schedule\n• **Morning briefing** — Full overview of emails + calendar\n\nWhat would you like to do?`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getClient } = useGraphClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: Message["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
    ]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    setInput("");
    addMessage("user", text);
    setIsProcessing(true);

    try {
      const lower = text.toLowerCase();

      if (
        lower.includes("email") ||
        lower.includes("inbox") ||
        lower.includes("mail") ||
        lower.includes("unread")
      ) {
        await handleEmailSummary();
      } else if (
        lower.includes("calendar") ||
        lower.includes("schedule") ||
        lower.includes("meeting") ||
        lower.includes("today")
      ) {
        await handleCalendar();
      } else if (
        lower.includes("briefing") ||
        lower.includes("brief") ||
        lower.includes("morning") ||
        lower.includes("overview")
      ) {
        await handleBriefing();
      } else {
        addMessage(
          "assistant",
          "I can help with:\n\n• **\"Summarize my emails\"** — Pull and summarize unread emails\n• **\"What's on my calendar?\"** — Today's schedule\n• **\"Morning briefing\"** — Full email + calendar overview\n\nMore capabilities coming soon — document generation, Teams integration, and approval workflows."
        );
      }
    } catch (err) {
      console.error(err);
      addMessage(
        "assistant",
        `Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. You may need to re-authenticate.`
      );
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleEmailSummary = async () => {
    addMessage("system", "📬 Fetching unread emails...");
    const client = await getClient();
    const emails = await getUnreadEmails(client, 10);

    if (emails.length === 0) {
      addMessage("assistant", "📭 Inbox zero! No unread emails right now.");
      return;
    }

    let summary = `📬 **${emails.length} unread email${emails.length > 1 ? "s" : ""}:**\n\n`;
    for (const email of emails) {
      const time = new Date(email.receivedDateTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const fromName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Unknown";
      summary += `**${email.subject || "(no subject)"}**\nFrom: ${fromName} • ${time}\n> ${email.bodyPreview?.slice(0, 120) || "No preview"}${email.bodyPreview?.length > 120 ? "..." : ""}\n\n`;
    }

    addMessage("assistant", summary);
  };

  const handleCalendar = async () => {
    addMessage("system", "📅 Checking today's calendar...");
    const client = await getClient();
    const events = await getTodayEvents(client);

    if (events.length === 0) {
      addMessage("assistant", "📅 No events on your calendar today. Clear schedule!");
      return;
    }

    let summary = `📅 **Today's schedule (${events.length} event${events.length > 1 ? "s" : ""}):**\n\n`;
    for (const event of events) {
      const start = new Date(event.start.dateTime + "Z").toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const end = new Date(event.end.dateTime + "Z").toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const location = event.location?.displayName ? ` • 📍 ${event.location.displayName}` : "";
      summary += `**${start} – ${end}** ${event.subject}${location}\n`;
    }

    addMessage("assistant", summary);
  };

  const handleBriefing = async () => {
    addMessage("system", "☕ Preparing your morning briefing...");
    const client = await getClient();

    const [emails, events, profile] = await Promise.all([
      getUnreadEmails(client, 10),
      getTodayEvents(client),
      getUserProfile(client).catch(() => null),
    ]);

    let brief = `# ☕ Morning Briefing`;
    if (profile?.displayName) brief += ` for ${profile.displayName.split(" ")[0]}`;
    brief += `\n*${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}*\n\n`;

    // Calendar
    brief += `## 📅 Today's Schedule\n`;
    if (events.length === 0) {
      brief += "No events today — clear calendar.\n\n";
    } else {
      for (const event of events) {
        const start = new Date(event.start.dateTime + "Z").toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        brief += `- **${start}** ${event.subject}\n`;
      }
      brief += "\n";
    }

    // Emails
    brief += `## 📬 Inbox\n`;
    if (emails.length === 0) {
      brief += "Inbox zero! No unread emails.\n";
    } else {
      brief += `${emails.length} unread:\n`;
      for (const email of emails.slice(0, 5)) {
        const fromName = email.from?.emailAddress?.name || "Unknown";
        brief += `- **${email.subject || "(no subject)"}** from ${fromName}\n`;
      }
      if (emails.length > 5) brief += `- ...and ${emails.length - 5} more\n`;
    }

    addMessage("assistant", brief);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">M365 Operator</h1>
            <p className="text-xs text-gray-500">{account.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800/50">
        <button
          onClick={() => {
            setInput("Summarize my unread emails");
            handleSend();
          }}
          disabled={isProcessing}
          className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          <Mail className="w-3 h-3" />
          Emails
        </button>
        <button
          onClick={() => {
            setInput("What's on my calendar today?");
            handleSend();
          }}
          disabled={isProcessing}
          className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          <Calendar className="w-3 h-3" />
          Calendar
        </button>
        <button
          onClick={() => {
            setInput("Morning briefing");
            handleSend();
          }}
          disabled={isProcessing}
          className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" />
          Briefing
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role !== "user" && (
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === "assistant"
                    ? "bg-blue-600/20 text-blue-400"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.role === "system"
                  ? "bg-gray-800/50 text-gray-400 text-xs italic"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={i} className="font-semibold text-white">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return part;
                })}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-gray-300" />
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
            <div className="bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your emails, calendar, or request a briefing..."
            disabled={isProcessing}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-2.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

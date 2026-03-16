"use client";

import { Mail, Calendar, FileText, Shield } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const features = [
    { icon: Mail, label: "Read & send emails", color: "var(--accent)" },
    { icon: Calendar, label: "Calendar management", color: "var(--success)" },
    { icon: FileText, label: "Generate documents", color: "var(--warning)" },
    { icon: Shield, label: "Approval-gated actions", color: "var(--error)" },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: "var(--bg-base)" }}>
      <div className="animate-scale-in w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="animate-slide-up">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            M
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}
          >
            M365 Operator
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            Your AI-powered Microsoft 365 assistant
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.label}
                className={`animate-slide-up delay-${[150, 225, 300, 375][i]} rounded-xl p-4`}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <Icon
                  className="mb-2 h-5 w-5"
                  style={{ color: feature.color }}
                />
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {feature.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Sign in button */}
        <div className="animate-slide-up delay-450">
          <button
            onClick={onLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-150"
            style={{ background: "var(--accent)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-dark)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="currentColor">
              <rect x="1" y="1" width="9" height="9" />
              <rect x="11" y="1" width="9" height="9" />
              <rect x="1" y="11" width="9" height="9" />
              <rect x="11" y="11" width="9" height="9" />
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        <p className="animate-fade-in text-xs" style={{ color: "var(--text-ghost)" }}>
          Connects to your Microsoft 365 account with your permission.
          <br />
          We only access what you approve.
        </p>
      </div>
    </div>
  );
}

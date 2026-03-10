"use client";

import { Mail, Calendar, FileText, Shield } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h1 className="text-3xl font-bold text-white">M365 Operator</h1>
          <p className="mt-2 text-gray-400">
            Your AI-powered Microsoft 365 assistant
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <Mail className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-sm text-gray-300">Read & send emails</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <Calendar className="w-5 h-5 text-green-400 mb-1" />
            <p className="text-sm text-gray-300">Calendar management</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <FileText className="w-5 h-5 text-orange-400 mb-1" />
            <p className="text-sm text-gray-300">Generate documents</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <Shield className="w-5 h-5 text-purple-400 mb-1" />
            <p className="text-sm text-gray-300">Approval-gated actions</p>
          </div>
        </div>

        {/* Sign in button */}
        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="currentColor">
            <rect x="1" y="1" width="9" height="9" />
            <rect x="11" y="1" width="9" height="9" />
            <rect x="1" y="11" width="9" height="9" />
            <rect x="11" y="11" width="9" height="9" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-xs text-gray-500">
          Connects to your Microsoft 365 account with your permission.
          <br />
          We only access what you approve.
        </p>
      </div>
    </div>
  );
}

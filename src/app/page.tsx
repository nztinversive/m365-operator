"use client";

import { AppShell } from "@/components/AppShell";
import { ChatView } from "@/components/ChatView";

export default function Home() {
  return (
    <AppShell fullHeight>
      {({ userId, account, onLogout }) => (
        <ChatView account={account} onLogout={onLogout} userId={userId} />
      )}
    </AppShell>
  );
}

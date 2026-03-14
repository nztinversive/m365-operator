"use client";

import { AppShell } from "@/components/AppShell";
import { SettingsPage } from "@/components/SettingsPage";

export default function SettingsRoutePage() {
  return (
    <AppShell>
      {({ userId, account }) => <SettingsPage userId={userId} account={account} />}
    </AppShell>
  );
}

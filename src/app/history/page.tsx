"use client";

import { AppShell } from "@/components/AppShell";
import { JobHistoryPage } from "@/components/JobHistoryPage";

export default function HistoryRoutePage() {
  return (
    <AppShell>
      {({ userId }) => <JobHistoryPage userId={userId} />}
    </AppShell>
  );
}

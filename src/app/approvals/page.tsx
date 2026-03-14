"use client";

import { AppShell } from "@/components/AppShell";
import { ApprovalsPage } from "@/components/ApprovalsPage";

export default function ApprovalsRoutePage() {
  return (
    <AppShell>
      {({ userId }) => <ApprovalsPage userId={userId} />}
    </AppShell>
  );
}

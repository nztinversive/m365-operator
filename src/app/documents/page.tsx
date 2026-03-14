"use client";

import { AppShell } from "@/components/AppShell";
import { DocumentsPage } from "@/components/DocumentsPage";

export default function DocumentsRoutePage() {
  return (
    <AppShell>
      {({ userId }) => <DocumentsPage userId={userId} />}
    </AppShell>
  );
}

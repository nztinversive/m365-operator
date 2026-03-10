# M365 Operator — Worker

The worker is the **brain** of the M365 Operator. It runs Claude as an autonomous agent with Microsoft Graph tools.

## How It Works

```
User sends request → Convex creates job → Worker picks it up
    → Claude Agent starts with M365 tools
    → Claude decides which tools to call (read emails, check calendar, etc.)
    → Tools execute against Microsoft Graph API
    → Claude generates response + documents
    → Results written back to Convex → UI updates in realtime
```

### The Agent Loop

Instead of hardcoded workflows, Claude operates in an **agentic loop**:

1. **Think** — Claude reads the task and decides what information it needs
2. **Act** — Calls tools (read_emails, get_calendar_events, etc.)
3. **Observe** — Reads the results from the tools
4. **Repeat** — Until the task is complete

This means Claude handles any M365 task dynamically. "Summarize my emails" and "create a weekly deck from Teams updates" both flow through the same agent — Claude figures out the steps.

### Tools Available

| Tool | Description | Approval? |
|------|-------------|-----------|
| `read_emails` | Read unread/recent/important emails | No |
| `read_email_detail` | Full email body by ID | No |
| `search_emails` | Search by keyword | No |
| `draft_email` | Create draft (not sent) | No |
| `send_email` | Actually send an email | **Yes** |
| `get_calendar_events` | Read calendar | No |
| `create_calendar_event` | Create event | Yes (if attendees) |
| `list_teams` | List joined Teams | No |
| `list_team_channels` | List channels | No |
| `read_channel_messages` | Read channel messages | No |
| `post_channel_message` | Post to Teams | **Yes** |
| `list_files` | Browse OneDrive | No |
| `search_files` | Search OneDrive | No |
| `upload_file` | Upload to OneDrive | No |
| `generate_word_document` | Create .docx | No |
| `generate_excel_workbook` | Create .xlsx | No |
| `generate_powerpoint` | Create .pptx | No |
| `get_user_profile` | Get user info | No |

### Approval Flow

Write actions (send email, post to Teams) pause the job and create an approval request in Convex. The UI shows the pending approval, user clicks approve/reject, and the worker resumes.

## Setup

```bash
cp .env.example .env
# Fill in your keys
npm install
npm run dev
```

## Architecture

- `claude-agent.ts` — Tool definitions + agent loop (the core)
- `job-processor.ts` — Job queue management, polling, execution
- `graph-client-manager.ts` — Microsoft Graph auth + token refresh
- `document-generators.ts` — Word/Excel/PowerPoint file generation
- `m365-tools.ts` — Legacy Graph wrappers (being replaced by tool executor)
- `index.ts` — Entry point

# Product Requirements Document (PRD)

## Product Name
Microsoft 365 Operator App

## Version
V1 Draft

## Author
Noah Thies

## Date
March 9, 2026

---

## 1. Executive Summary
The Microsoft 365 Operator App is an AI-powered assistant that helps users work across Outlook, Teams, OneDrive/SharePoint, and Microsoft Office documents from a single chat-based interface. The product uses Claude as the reasoning and execution engine, Convex as the realtime backend and state layer, and Microsoft Graph as the integration layer for Microsoft 365 services.

The initial version will allow a user to:
- Read and summarize Outlook emails and calendar items
- Read selected Teams channels and chats
- Draft and send emails with approval
- Generate Word documents, Excel workbooks, and PowerPoint decks
- Upload files to OneDrive or SharePoint
- Post approved summaries or updates to Teams
- Track jobs, approvals, outputs, and history through a live web interface

The app is designed as a practical operator, not just a chatbot. It should complete multi-step work on the user’s behalf while keeping the user in control of sensitive actions.

---

## 2. Problem Statement
Knowledge workers spend a large amount of time switching between Outlook, Teams, Word, Excel, PowerPoint, and shared files to complete repetitive operational work. Common tasks such as preparing a morning briefing, building a weekly status deck, compiling meeting notes, or turning email threads into trackers require context gathering across multiple tools.

Current AI chat tools can help generate content, but they often do not:
- Maintain structured workflows across Microsoft 365 tools
- Keep job state and outputs synced across devices
- Provide approval-gated actions before sending, posting, or modifying documents
- Offer a persistent operator workflow that can plan, gather context, create outputs, and return links/results

This product solves that by giving users a single AI operator interface connected to their Microsoft 365 environment.

---

## 3. Product Vision
Build a reliable AI operator for Microsoft 365 that can turn user intent into completed work products such as summaries, reports, trackers, and presentations, while keeping approvals, traceability, and user control built into the experience.

---

## 4. Goals
### Primary Goals
- Let users complete Microsoft 365 workflows from one chat interface
- Generate useful business outputs in Word, Excel, and PowerPoint
- Provide live progress tracking and approval flows
- Keep web and mobile experiences in sync through a realtime backend
- Design the system so it can scale from a single-user operator to a multi-user SaaS product

### Success Criteria for V1
- A user can connect Microsoft 365 successfully
- A user can generate a Word document from meetings or email context
- A user can create or update an Excel tracker
- A user can generate a PowerPoint weekly status deck
- A user can approve or reject sensitive actions before they are executed
- Generated files are saved to OneDrive or SharePoint with links returned to the app
- The UI shows live job progress, outputs, and approval requests

---

## 5. Non-Goals for V1
- Deep editing inside native Word, Excel, or PowerPoint windows
- Fully autonomous sending/posting without approvals
- Broad support for every Microsoft 365 workload
- Complex enterprise admin tooling
- Rich desktop automation or local-machine control
- Full multi-agent orchestration beyond the core operator flow

These can be considered in later versions.

---

## 6. Target Users
### Primary User
A professional or operator who works heavily in Microsoft 365 and wants an AI assistant to help compile, summarize, and produce work outputs faster.

### Secondary Users
- Managers creating weekly reports and updates
- Operations teams maintaining trackers and meeting recaps
- Founders or executives wanting a daily briefing assistant
- Internal teams preparing status decks and action logs

---

## 7. Core Use Cases
1. **Morning Briefing**
   - Read unread Outlook emails
   - Pull today’s calendar items
   - Review selected Teams updates
   - Generate a concise Word daily brief
   - Optionally post a summary to Teams after approval

2. **Meeting to Document**
   - Gather context from Outlook, Teams, and user prompts
   - Create a polished Word meeting recap
   - Include summary, action items, owners, and deadlines
   - Save file to OneDrive/SharePoint

3. **Excel Tracker Builder**
   - Create or update an Excel workbook for tasks, KPIs, or project tracking
   - Populate tables and workbook structure from structured inputs
   - Save updated workbook and return a link

4. **Weekly Status Deck**
   - Collect context from Outlook, Teams, and existing project notes
   - Generate a PowerPoint deck with wins, blockers, metrics, and next steps
   - Save to OneDrive/SharePoint
   - Optionally share the deck link to Teams after approval

5. **Draft and Send Communication**
   - Draft an email or Teams message based on source context
   - Present the draft in the UI
   - Only send/post after the user approves

---

## 8. Product Scope
### In Scope for V1
- Web-based chat interface
- Microsoft Entra sign-in
- Outlook read/send support
- Calendar read/create support
- Teams channel read/post support
- Teams chat read/post support if enabled later in V1 or early V1.1
- File upload to OneDrive or SharePoint
- Word document generation
- Excel workbook generation and limited Graph-based workbook updates
- PowerPoint generation
- Approval workflow for sensitive actions
- Realtime job tracking and history
- Dedicated long-running Claude worker service

### Out of Scope for V1
- Native Office task-pane add-ins
- Advanced SharePoint site management
- App-only Teams posting flows
- Local machine control and OS-level automation
- End-user skill marketplace

---

## 9. Solution Overview
The product consists of four major layers:

### 9.1 Frontend Application
A Next.js web application provides:
- Chat interface
- Job status and progress updates
- Approval prompts
- Generated file links and output history
- Session and conversation history

### 9.2 Realtime Backend and State Layer
Convex is used for:
- Authentication-aware application data
- Job creation and orchestration
- Conversation and message history
- Approval records
- Structured memory and metadata
- Realtime UI sync across clients
- Scheduling, retries, and stale job recovery

### 9.3 Dedicated Agent Worker Server
A separate Node/TypeScript worker service runs the Claude Agent SDK in streaming mode. This worker is required because the core agent experience depends on a long-running process with a persistent environment. The worker will:
- Claim queued jobs from Convex
- Start or resume Claude sessions
- Execute Microsoft Graph tool calls
- Generate Word, Excel, and PowerPoint files
- Pause for approvals when needed
- Push progress updates back to Convex

### 9.4 Microsoft 365 Integration Layer
Microsoft Graph is used to connect to:
- Outlook mail
- Outlook calendar
- Teams channels and chats
- OneDrive or SharePoint files
- Excel workbook APIs for structured workbook edits

Generated files are uploaded to Microsoft storage and linked back into the application.

---

## 10. Why This Architecture
### Why Claude
Claude is being used as the core operator because the product requires multi-step tool use, reasoning over context, permissions, and persistent task execution.

### Why Convex
Convex provides realtime state sync, durable workflow support, and a clean way to manage jobs, approvals, and client updates.

### Why a Dedicated Worker Server
The live Claude runtime should not run inside Convex actions. Convex actions have a time limit and are better used for shorter external calls. The product needs a persistent runtime for agent sessions, tool execution, and approval-aware flows, so the worker is a separate service.

### Why Microsoft Graph
Graph provides the official integration path for Outlook, Teams, OneDrive/SharePoint, and Excel workbook operations.

---

## 11. Functional Requirements
### 11.1 Authentication and User Setup
- Users must be able to sign in with Microsoft 365
- Users must be able to grant the required delegated Graph permissions
- The system must store connection state and token metadata securely
- The app must support token refresh for ongoing authorized use

### 11.2 Chat and Task Initiation
- Users must be able to submit natural-language requests in chat
- Requests must create structured jobs in Convex
- Jobs must have clear statuses such as queued, running, waiting_approval, completed, failed

### 11.3 Outlook Support
- Read unread and recent emails
- Retrieve relevant email thread context
- Draft email responses
- Send email only after approval
- Read today’s and upcoming calendar items
- Create calendar events with approval when needed

### 11.4 Teams Support
- Read selected channels
- Read channel messages and chat messages where enabled
- Draft channel or chat messages
- Post channel or chat messages only after approval
- Return links or metadata for successful posts when available

### 11.5 Document Generation
- Generate `.docx` files for meeting recaps, summaries, and reports
- Generate `.xlsx` files for trackers, KPI sheets, or action logs
- Generate `.pptx` files for status decks and presentation summaries
- Upload generated files to OneDrive or SharePoint
- Return file links to the user in the UI

### 11.6 Excel Workbook Operations
- Create new Excel workbooks
- Populate sheets, tables, and cell ranges
- Update existing workbooks stored in OneDrive/SharePoint when the user explicitly requests it
- Limit workbook modifications in V1 to safe, structured operations

### 11.7 Job Tracking
- Show job progress in realtime
- Show job outputs and links
- Preserve task history and conversation history
- Support retries for failed jobs where possible

### 11.8 Approvals and Safety
- Sending emails must require approval
- Posting to Teams must require approval
- Overwriting existing files must require approval
- Creating external calendar invites must require approval
- Destructive actions such as deletion must require approval
- Read-only operations can execute automatically

### 11.9 Auditability
- All major agent actions must be logged
- Approval requests and approval decisions must be stored
- Output files must be linked to the originating job where possible

---

## 12. Non-Functional Requirements
### Performance
- Job creation should feel immediate in the UI
- Progress updates should stream in near realtime
- Common workflows should complete within a practical time window for business use

### Reliability
- Jobs must survive transient failures where possible
- Worker crashes should not permanently orphan jobs
- A heartbeat or stale-job recovery flow must exist

### Security
- Microsoft credentials and tokens must be encrypted at rest
- Sensitive actions must be approval-gated
- Worker environments must be isolated and sandboxed
- Access to user data must follow least-privilege principles

### Scalability
- The system should launch with one worker but support multiple workers later
- Job claiming should prevent duplicate execution
- The architecture should support multi-user growth without a major rewrite

### Maintainability
- Tool wrappers for Microsoft Graph should be modular
- Document generation should be encapsulated in reusable libraries
- Skills/prompts should be versioned and easy to update

---

## 13. User Experience Requirements
### Core UX Principles
- The user should always know what the agent is doing
- The UI should make it obvious when approval is required
- Generated outputs should be easy to find and open
- Errors should be understandable and actionable
- The experience should feel like a reliable operator, not an unpredictable black box

### Main Screens
- Chat / operator screen
- Job history screen
- Approval queue screen
- Output documents screen
- Integration settings screen

---

## 14. Data Model
### Key Tables
- `users`
- `microsoft_connections`
- `agent_sessions`
- `conversations`
- `messages`
- `jobs`
- `approvals`
- `documents`
- `memories`
- `audit_logs`

### Example Job Status Values
- `queued`
- `running`
- `waiting_approval`
- `completed`
- `failed`
- `cancelled`

---

## 15. Required Microsoft Permissions
### Base Sign-In
- `openid`
- `profile`
- `offline_access`
- `User.Read`

### Outlook and Calendar
- `Mail.Read`
- `Mail.Send`
- `Calendars.ReadWrite`

### Teams Channels
- `Team.ReadBasic.All`
- `Channel.ReadBasic.All`
- `ChannelMessage.Read.All`
- `ChannelMessage.Send`

### Teams Chats
- `Chat.ReadBasic`
- `Chat.Read`
- `ChatMessage.Send`

### Files and Documents
- `Files.ReadWrite`

Additional scopes should only be added when a concrete workflow requires them.

---

## 16. Dedicated Agent Worker Server Specification
### Role
The Dedicated Agent Worker Server is the runtime that executes long-running Claude sessions and tool-driven jobs.

### Responsibilities
- Poll or receive queued jobs from Convex
- Claim jobs safely
- Create isolated working directories per run
- Run Claude Agent SDK in streaming mode
- Call Microsoft Graph wrappers and document generators
- Update progress and results in Convex
- Pause for user approvals when necessary
- Handle cleanup and job completion

### Initial Deployment Recommendation
- One containerized Node/TypeScript worker
- 2 vCPU
- 4 GB RAM
- 20 to 40 GB SSD
- Dockerized deployment
- Sandboxed working directories

### Future Scaling
- Scale horizontally by adding worker replicas
- Use a locking/claim model in Convex to prevent duplicate execution
- Add per-tenant or per-user worker isolation later if needed

---

## 17. Skills / Agent Capabilities for V1
### Skill 1: Daily Briefing
Pull emails, calendar items, and selected Teams updates into a daily summary.

### Skill 2: Meeting to Word
Turn meeting context into a clean Word recap with action items.

### Skill 3: Excel KPI Builder
Create or update KPI and tracker workbooks.

### Skill 4: Status Deck
Build a weekly PowerPoint deck from project context.

### Skill 5: Teams Poster
Draft and post a concise Teams update after approval.

### Skill 6: File Router
Save outputs to the correct OneDrive/SharePoint destination and return links.

---

## 18. MVP Release Definition
The MVP is considered complete when a signed-in user can:
1. Connect Microsoft 365
2. Ask for a daily or weekly summary workflow in chat
3. Have the system gather Outlook, calendar, and Teams context
4. Generate at least one Word file, one Excel file, and one PowerPoint file
5. Save those files to OneDrive/SharePoint
6. Approve and send one email or Teams post generated by the assistant
7. See all progress, approvals, and outputs in the app UI

---

## 19. Risks and Constraints
### Risk 1: Teams API behavior and permission complexity
Teams write flows are more restrictive and should be implemented carefully with delegated user auth.

### Risk 2: Long-running job reliability
Without a dedicated worker and recovery logic, sessions can fail mid-task.

### Risk 3: Scope creep into full Office automation
Trying to deeply control native Office apps in V1 would slow the product down significantly.

### Risk 4: Over-permissioning Microsoft access
The app must request only the scopes needed for real workflows.

### Risk 5: User trust
Users need clear approval gates and visibility into what the assistant is doing.

---

## 20. Release Phases
### Phase 1: Core Operator MVP
- Microsoft sign-in
- Outlook + calendar support
- Teams channel read/post
- Word, Excel, PowerPoint generation
- OneDrive/SharePoint uploads
- Approval queue
- Job history and outputs
- Single worker deployment

### Phase 2: Operational Refinement
- Better retries and stale-job recovery
- Improved file routing and templates
- More structured Excel editing
- Better memory and personalized workflows

### Phase 3: Advanced Office Experience
- Office Add-ins for Word, Excel, and PowerPoint
- In-document assistance and edits
- Expanded multi-user workspace features

---

## 21. Open Questions
- Should Teams chat support be part of V1 or V1.1?
- Should file uploads default to OneDrive, SharePoint, or be user-configurable?
- What folder structure should generated documents use by default?
- How much editing of existing Excel workbooks should be allowed in V1?
- Should users be able to define custom templates for decks and reports in the MVP?
- Should morning briefing and weekly status deck be packaged as first-class templates in the UI?

---

## 22. Recommended First Workflow
The strongest first workflow to launch is:

### Morning Briefing + Output Pack
The user asks for a daily briefing. The system:
- pulls unread Outlook emails
- gathers today’s calendar items
- reads selected Teams updates
- creates a Word daily brief
- creates an Excel action tracker
- optionally drafts a Teams summary post for approval

This workflow demonstrates the product’s core value without requiring the full complexity of every feature at once.

---

## 23. Summary
This product is a Microsoft 365 AI operator built on Claude, Convex, and Microsoft Graph. The most important architectural decision is to separate the long-running Claude runtime into a dedicated worker service while using Convex as the realtime backend and orchestration layer. V1 should focus on practical workflows that create real business outputs in Word, Excel, and PowerPoint, with approval-gated actions and clear user visibility throughout the process.

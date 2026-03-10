# M365 Operator

An AI-powered assistant that helps you work across Microsoft 365 from a single chat interface. Built with Next.js, Convex, and Claude AI.

## 🎯 Overview

The M365 Operator transforms how you work with Microsoft 365. Instead of switching between Outlook, Teams, Word, Excel, and PowerPoint, just tell the operator what you need:

- **"Generate my morning briefing"** → Creates Word doc with emails + calendar
- **"Create a weekly status deck"** → Builds PowerPoint from your context  
- **"Send update to the team"** → Drafts and posts to Teams (with approval)
- **"Build a tracker for this project"** → Creates Excel workbook with structured data

## ✨ Key Features

### 📧 Email & Calendar
- Read and summarize unread emails
- Create calendar events
- Generate email responses (with approval)
- Pull context from specific date ranges

### 👥 Teams Integration  
- Read channel messages
- Post updates and summaries (approval-gated)
- Channel-specific context gathering

### 📄 Document Generation
- **Word**: Meeting recaps, daily briefings, reports
- **Excel**: Trackers, KPI sheets, data tables  
- **PowerPoint**: Status decks, presentation summaries
- Auto-upload to OneDrive/SharePoint with links

### 🛡️ Safety & Control
- Approval queue for sensitive actions (sending, posting, overwriting)
- Real-time job tracking and progress
- Audit logs for all operations
- Token management and refresh handling

## 🏗️ Architecture

### Frontend (Next.js 16)
- Modern React 19 with Tailwind CSS
- Microsoft authentication via MSAL
- Real-time updates via Convex subscriptions
- Multi-page interface (Chat, Jobs, Approvals, Documents, Settings)

### Backend (Convex)
- Real-time database with live subscriptions  
- Job orchestration and state management
- Approval workflow system
- User and connection management

### Worker Service (Separate Node.js Service)
- Long-running Claude AI sessions
- Microsoft Graph API operations
- Office document generation (docx, xlsx, pptx)
- Job claiming and execution with timeout handling

## 🚀 Quick Start

### 1. Main Application
```bash
# Install dependencies
npm install

# Set up environment (copy .env.local.example to .env.local)
cp .env.local.example .env.local

# Start Convex
npx convex dev

# Start Next.js (in another terminal)
npm run dev
```

### 2. Worker Service
```bash
cd worker

# Install worker dependencies  
npm install

# Set up worker environment
cp .env.example .env

# Start the worker
npm run dev
```

### 3. Required Environment Variables

**Main App (.env.local):**
```env
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id
```

**Worker (.env):**
```env
CONVEX_URL=your_convex_url
ANTHROPIC_API_KEY=your_claude_api_key
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
```

## 🔧 Setup Requirements

### Azure App Registration
1. Create Azure AD app registration
2. Add these redirect URIs:
   - `http://localhost:3000` (development)
   - Your production URL
3. Configure API permissions:
   - `User.Read`, `Mail.Read`, `Mail.Send`
   - `Calendars.ReadWrite`
   - `ChannelMessage.Read.All`, `ChannelMessage.Send`
   - `Files.ReadWrite`

### Convex Project
1. Create project at [convex.dev](https://convex.dev)
2. Deploy schema: `npx convex deploy`
3. Note your deployment URL

### Anthropic API
1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Configure for Claude 3 Sonnet access

## 📱 Usage Examples

### Morning Briefing Workflow
```
You: "Generate my morning briefing"

Operator:
✓ Gathering emails and calendar... 
✓ Analyzing with Claude AI...
✓ Creating Word document...
✓ Uploading to OneDrive...

📄 Daily Briefing - March 10, 2026.docx
📎 https://yourorg-my.sharepoint.com/...
```

### Status Deck Creation
```
You: "Create weekly status deck for the Q1 project"

Operator:
✓ Pulling context from emails and Teams...
✓ Generating PowerPoint slides...
✓ Uploading presentation...

📊 Q1 Project Status - Week 10.pptx
📎 https://yourorg-my.sharepoint.com/...
```

### Approval-Gated Actions
```
You: "Email the team about the deadline change"

Operator:
📧 Draft email ready for approval:
To: project-team@company.com
Subject: Q1 Deadline Update
[Preview of email content]

[Approve] [Reject] buttons appear in Approval Queue
```

## 🗂️ Project Structure

```
m365-operator/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   │   ├── ChatView.tsx      # Main operator interface
│   │   ├── JobHistory.tsx    # Job tracking
│   │   ├── ApprovalQueue.tsx # Approval management
│   │   ├── DocumentsPage.tsx # Generated files
│   │   └── SettingsPage.tsx  # User settings
│   └── lib/               # Utilities
│       ├── graph-client.ts   # Microsoft Graph
│       └── document-generators.ts # Office docs
│
├── convex/                 # Convex backend  
│   ├── schema.ts          # Database schema
│   ├── jobs.ts            # Job management
│   ├── approvals.ts       # Approval workflows  
│   ├── messages.ts        # Chat history
│   └── documents.ts       # File tracking
│
├── worker/                 # Separate worker service
│   └── src/
│       ├── job-processor.ts    # Core job logic
│       ├── claude-agent.ts     # AI integration
│       ├── graph-client-manager.ts # Auth handling
│       └── m365-tools.ts       # Microsoft 365 ops
│
└── README.md              # This file
```

## 🎯 Roadmap

### Phase 1: Core MVP (Current)
- [x] Microsoft authentication
- [x] Email and calendar integration  
- [x] Basic document generation
- [x] Approval workflows
- [x] Job tracking and history

### Phase 2: Enhanced Operations
- [ ] Advanced Excel editing via Graph API
- [ ] Template management for documents
- [ ] Scheduled/recurring briefings
- [ ] Multi-user workspace features

### Phase 3: Advanced AI
- [ ] Office Add-ins integration
- [ ] Advanced memory and personalization
- [ ] Multi-agent workflows
- [ ] Custom skill marketplace

## 📋 Available Commands

```bash
# Main application
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Convex
npx convex dev       # Start Convex development
npx convex deploy    # Deploy to production

# Worker service  
cd worker
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm start            # Start production worker
```

## 🤝 Contributing

1. Read the [PRD.md](PRD.md) for detailed requirements
2. Check existing issues and feature requests
3. Fork the repository and create a feature branch
4. Submit a PR with clear description and tests

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**"Token expired" errors:**
- Sign out and back in to refresh Microsoft tokens
- Check Azure app permissions are granted

**Worker not processing jobs:**
- Verify all environment variables are set
- Check Convex connection and schema deployment
- Review worker logs for specific errors

**Document generation failures:**
- Ensure OneDrive permissions are granted
- Check file path and naming restrictions
- Verify workspace quotas and limits

### Getting Help

- Check the [Issues](https://github.com/your-org/m365-operator/issues) page
- Review the [PRD.md](PRD.md) for detailed architecture
- See worker [README](worker/README.md) for service-specific help
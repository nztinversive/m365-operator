import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@microsoft/microsoft-graph-client';
import type { Tool, MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import { generateWordDocument, generateExcelWorkbook, generatePowerPointPresentation } from './document-generators.js';

// ─── Tool Definitions ───────────────────────────────────────────────
// These are the "hands" we give Claude. Each tool maps to a Microsoft Graph operation.
// Claude sees the name, description, and input schema — then decides when to call them.

export const M365_TOOLS: Tool[] = [
  // ── Email Tools ──
  {
    name: 'read_emails',
    description: 'Read unread or recent emails from Outlook inbox. Returns subject, sender, preview, and importance.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filter: {
          type: 'string',
          enum: ['unread', 'recent', 'important'],
          description: 'Which emails to fetch. "unread" = unread only, "recent" = last N emails, "important" = high importance',
        },
        count: {
          type: 'number',
          description: 'Number of emails to return (default 10, max 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'read_email_detail',
    description: 'Read the full body of a specific email by ID. Use after read_emails to get details on a specific message.',
    input_schema: {
      type: 'object' as const,
      properties: {
        email_id: {
          type: 'string',
          description: 'The email message ID',
        },
      },
      required: ['email_id'],
    },
  },
  {
    name: 'search_emails',
    description: 'Search emails by keyword query. Searches subject, body, and sender.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        count: {
          type: 'number',
          description: 'Max results to return (default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'draft_email',
    description: 'Create a draft email. Does NOT send it — creates a draft that requires user approval before sending. Use this for composing emails.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of recipient email addresses',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body in HTML format',
        },
        cc: {
          type: 'array',
          items: { type: 'string' },
          description: 'CC recipients (optional)',
        },
        reply_to_id: {
          type: 'string',
          description: 'If replying to an email, the original message ID',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email immediately. IMPORTANT: Only call this after receiving explicit user approval. For new emails, prefer draft_email first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recipient email addresses',
        },
        subject: { type: 'string' },
        body: { type: 'string', description: 'HTML body content' },
        cc: { type: 'array', items: { type: 'string' } },
      },
      required: ['to', 'subject', 'body'],
    },
  },

  // ── Calendar Tools ──
  {
    name: 'get_calendar_events',
    description: 'Get calendar events for a date range. Defaults to today if no range specified.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (default: start of today)',
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (default: end of today)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. Requires approval if attendees are included.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subject: { type: 'string', description: 'Event title' },
        start: { type: 'string', description: 'Start time in ISO format' },
        end: { type: 'string', description: 'End time in ISO format' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Email addresses of attendees (optional)',
        },
        location: { type: 'string', description: 'Event location (optional)' },
        body: { type: 'string', description: 'Event description in HTML (optional)' },
        is_online: { type: 'boolean', description: 'Create as online meeting (default false)' },
      },
      required: ['subject', 'start', 'end'],
    },
  },

  // ── Teams Tools ──
  {
    name: 'list_teams',
    description: 'List all Teams the user has joined.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_team_channels',
    description: 'List channels in a specific Team.',
    input_schema: {
      type: 'object' as const,
      properties: {
        team_id: { type: 'string', description: 'The Team ID' },
      },
      required: ['team_id'],
    },
  },
  {
    name: 'read_channel_messages',
    description: 'Read recent messages from a Teams channel.',
    input_schema: {
      type: 'object' as const,
      properties: {
        team_id: { type: 'string' },
        channel_id: { type: 'string' },
        count: { type: 'number', description: 'Number of messages (default 20)' },
      },
      required: ['team_id', 'channel_id'],
    },
  },
  {
    name: 'post_channel_message',
    description: 'Post a message to a Teams channel. Requires user approval before executing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        team_id: { type: 'string' },
        channel_id: { type: 'string' },
        message: { type: 'string', description: 'Message content in HTML' },
        subject: { type: 'string', description: 'Optional subject/topic line' },
      },
      required: ['team_id', 'channel_id', 'message'],
    },
  },

  // ── File/OneDrive Tools ──
  {
    name: 'list_files',
    description: 'List files and folders in OneDrive. Specify a folder path or leave empty for root.',
    input_schema: {
      type: 'object' as const,
      properties: {
        folder: { type: 'string', description: 'Folder path (default: root)' },
      },
      required: [],
    },
  },
  {
    name: 'upload_file',
    description: 'Upload a generated file to OneDrive. Returns the file URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_name: { type: 'string', description: 'Name of the file including extension' },
        file_type: {
          type: 'string',
          enum: ['word', 'excel', 'powerpoint'],
          description: 'Type of document to generate and upload',
        },
        content: {
          type: 'object',
          description: 'Content specification for the document. Structure depends on file_type.',
          properties: {},
          additionalProperties: true,
        },
        folder: { type: 'string', description: 'OneDrive folder to upload to (default: "M365 Operator")' },
      },
      required: ['file_name', 'file_type', 'content'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files in OneDrive by name or content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },

  // ── Document Generation Tools ──
  {
    name: 'generate_word_document',
    description: 'Generate a Word (.docx) document with structured content. Returns the document buffer for upload.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Document title' },
        sections: {
          type: 'array',
          description: 'Array of document sections',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['heading', 'paragraph', 'bullet_list', 'table'] },
              content: { type: 'string', description: 'Text content' },
              level: { type: 'number', description: 'Heading level (1-3), only for heading type' },
              items: {
                type: 'array',
                items: { type: 'string' },
                description: 'Bullet items, only for bullet_list type',
              },
              table_data: {
                type: 'object',
                properties: {
                  headers: { type: 'array', items: { type: 'string' } },
                  rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
                },
                description: 'Table data, only for table type',
              },
            },
            required: ['type'],
          },
        },
      },
      required: ['title', 'sections'],
    },
  },
  {
    name: 'generate_excel_workbook',
    description: 'Generate an Excel (.xlsx) workbook with worksheets and data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        worksheets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Worksheet/tab name' },
              headers: { type: 'array', items: { type: 'string' } },
              rows: { type: 'array', items: { type: 'array', items: {} } },
            },
            required: ['name', 'headers', 'rows'],
          },
        },
      },
      required: ['worksheets'],
    },
  },
  {
    name: 'generate_powerpoint',
    description: 'Generate a PowerPoint (.pptx) presentation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Presentation title (shown on title slide)' },
        slides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              bullets: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string', description: 'Speaker notes (optional)' },
            },
            required: ['title'],
          },
        },
      },
      required: ['title', 'slides'],
    },
  },

  // ── User Info ──
  {
    name: 'get_user_profile',
    description: 'Get the signed-in user\'s profile info (name, email, job title, department).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Tool Actions that need approval before executing ───────────────
export const APPROVAL_REQUIRED_TOOLS = new Set([
  'send_email',
  'post_channel_message',
  'create_calendar_event', // only when attendees present
]);

// ─── Tool Executor ──────────────────────────────────────────────────
// This is the bridge between Claude's tool calls and actual Microsoft Graph API calls.

export class ToolExecutor {
  constructor(private graphClient: Client) {}

  async execute(toolName: string, input: Record<string, any>): Promise<string> {
    try {
      switch (toolName) {
        case 'read_emails':
          return await this.readEmails(input);
        case 'read_email_detail':
          return await this.readEmailDetail(input);
        case 'search_emails':
          return await this.searchEmails(input);
        case 'draft_email':
          return await this.draftEmail(input);
        case 'send_email':
          return await this.sendEmail(input);
        case 'get_calendar_events':
          return await this.getCalendarEvents(input);
        case 'create_calendar_event':
          return await this.createCalendarEvent(input);
        case 'list_teams':
          return await this.listTeams();
        case 'list_team_channels':
          return await this.listTeamChannels(input);
        case 'read_channel_messages':
          return await this.readChannelMessages(input);
        case 'post_channel_message':
          return await this.postChannelMessage(input);
        case 'list_files':
          return await this.listFiles(input);
        case 'search_files':
          return await this.searchFiles(input);
        case 'get_user_profile':
          return await this.getUserProfile();
        // Document generation tools are handled separately (they produce buffers, not Graph calls)
        default:
          return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Tool ${toolName} failed:`, msg);
      return JSON.stringify({ error: msg });
    }
  }

  private async readEmails(input: Record<string, any>): Promise<string> {
    const count = Math.min(input.count || 10, 50);
    const filter = input.filter || 'unread';

    let apiCall = this.graphClient.api('/me/mailFolders/inbox/messages');

    if (filter === 'unread') {
      apiCall = apiCall.filter('isRead eq false');
    } else if (filter === 'important') {
      apiCall = apiCall.filter("importance eq 'high'");
    }

    const result = await apiCall
      .top(count)
      .orderby('receivedDateTime desc')
      .select('id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments,importance')
      .get();

    return JSON.stringify(result.value.map((email: any) => ({
      id: email.id,
      subject: email.subject,
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address,
      from_email: email.from?.emailAddress?.address,
      received: email.receivedDateTime,
      preview: email.bodyPreview?.substring(0, 200),
      is_read: email.isRead,
      has_attachments: email.hasAttachments,
      importance: email.importance,
    })));
  }

  private async readEmailDetail(input: Record<string, any>): Promise<string> {
    const result = await this.graphClient
      .api(`/me/messages/${input.email_id}`)
      .select('id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments,importance,conversationId')
      .get();

    return JSON.stringify({
      id: result.id,
      subject: result.subject,
      from: result.from?.emailAddress,
      to: result.toRecipients?.map((r: any) => r.emailAddress),
      cc: result.ccRecipients?.map((r: any) => r.emailAddress),
      received: result.receivedDateTime,
      body: result.body?.content,
      body_type: result.body?.contentType,
      has_attachments: result.hasAttachments,
      conversation_id: result.conversationId,
    });
  }

  private async searchEmails(input: Record<string, any>): Promise<string> {
    const result = await this.graphClient
      .api('/me/mailFolders/inbox/messages')
      .search(input.query)
      .top(input.count || 10)
      .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
      .get();

    return JSON.stringify(result.value.map((email: any) => ({
      id: email.id,
      subject: email.subject,
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address,
      received: email.receivedDateTime,
      preview: email.bodyPreview?.substring(0, 200),
    })));
  }

  private async draftEmail(input: Record<string, any>): Promise<string> {
    const draft = await this.graphClient.api('/me/messages').post({
      subject: input.subject,
      body: { contentType: 'HTML', content: input.body },
      toRecipients: input.to.map((email: string) => ({ emailAddress: { address: email } })),
      ...(input.cc && {
        ccRecipients: input.cc.map((email: string) => ({ emailAddress: { address: email } })),
      }),
    });

    return JSON.stringify({
      draft_id: draft.id,
      status: 'draft_created',
      message: 'Email draft created. It will need user approval before sending.',
    });
  }

  private async sendEmail(input: Record<string, any>): Promise<string> {
    await this.graphClient.api('/me/sendMail').post({
      message: {
        subject: input.subject,
        body: { contentType: 'HTML', content: input.body },
        toRecipients: input.to.map((email: string) => ({ emailAddress: { address: email } })),
        ...(input.cc && {
          ccRecipients: input.cc.map((email: string) => ({ emailAddress: { address: email } })),
        }),
      },
    });

    return JSON.stringify({ status: 'sent', message: 'Email sent successfully.' });
  }

  private async getCalendarEvents(input: Record<string, any>): Promise<string> {
    const now = new Date();
    const startDate = input.start_date
      ? new Date(input.start_date)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = input.end_date
      ? new Date(input.end_date)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const result = await this.graphClient
      .api('/me/calendarView')
      .query({ startDateTime: startDate.toISOString(), endDateTime: endDate.toISOString() })
      .orderby('start/dateTime')
      .select('id,subject,start,end,location,organizer,attendees,bodyPreview,isOnlineMeeting,onlineMeeting')
      .get();

    return JSON.stringify(result.value.map((event: any) => ({
      id: event.id,
      subject: event.subject,
      start: event.start,
      end: event.end,
      location: event.location?.displayName,
      organizer: event.organizer?.emailAddress?.name,
      attendee_count: event.attendees?.length || 0,
      preview: event.bodyPreview?.substring(0, 150),
      is_online: event.isOnlineMeeting,
      join_url: event.onlineMeeting?.joinUrl,
    })));
  }

  private async createCalendarEvent(input: Record<string, any>): Promise<string> {
    const eventData: any = {
      subject: input.subject,
      start: { dateTime: input.start, timeZone: 'UTC' },
      end: { dateTime: input.end, timeZone: 'UTC' },
    };

    if (input.attendees?.length) {
      eventData.attendees = input.attendees.map((email: string) => ({
        emailAddress: { address: email },
        type: 'required',
      }));
    }
    if (input.location) eventData.location = { displayName: input.location };
    if (input.body) eventData.body = { contentType: 'HTML', content: input.body };
    if (input.is_online) eventData.isOnlineMeeting = true;

    const result = await this.graphClient.api('/me/calendar/events').post(eventData);

    return JSON.stringify({
      id: result.id,
      subject: result.subject,
      status: 'created',
      web_link: result.webLink,
    });
  }

  private async listTeams(): Promise<string> {
    const result = await this.graphClient
      .api('/me/joinedTeams')
      .select('id,displayName,description')
      .get();

    return JSON.stringify(result.value);
  }

  private async listTeamChannels(input: Record<string, any>): Promise<string> {
    const result = await this.graphClient
      .api(`/teams/${input.team_id}/channels`)
      .select('id,displayName,description,membershipType')
      .get();

    return JSON.stringify(result.value);
  }

  private async readChannelMessages(input: Record<string, any>): Promise<string> {
    const result = await this.graphClient
      .api(`/teams/${input.team_id}/channels/${input.channel_id}/messages`)
      .top(input.count || 20)
      .orderby('createdDateTime desc')
      .select('id,messageType,createdDateTime,from,body,subject')
      .get();

    return JSON.stringify(result.value.map((msg: any) => ({
      id: msg.id,
      type: msg.messageType,
      from: msg.from?.user?.displayName,
      content: msg.body?.content,
      subject: msg.subject,
      created: msg.createdDateTime,
    })));
  }

  private async postChannelMessage(input: Record<string, any>): Promise<string> {
    await this.graphClient
      .api(`/teams/${input.team_id}/channels/${input.channel_id}/messages`)
      .post({
        body: { contentType: 'html', content: input.message },
        ...(input.subject && { subject: input.subject }),
      });

    return JSON.stringify({ status: 'posted', message: 'Message posted to Teams channel.' });
  }

  private async listFiles(input: Record<string, any>): Promise<string> {
    const folder = input.folder;
    const endpoint = folder
      ? `/me/drive/root:/${folder}:/children`
      : '/me/drive/root/children';

    const result = await this.graphClient
      .api(endpoint)
      .select('id,name,webUrl,size,lastModifiedDateTime,file,folder')
      .get();

    return JSON.stringify(result.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      url: item.webUrl,
      size: item.size,
      modified: item.lastModifiedDateTime,
      type: item.file ? 'file' : 'folder',
      mime_type: item.file?.mimeType,
    })));
  }

  private async searchFiles(input: Record<string, any>): Promise<string> {
    const result = await this.graphClient
      .api(`/me/drive/root/search(q='${input.query}')`)
      .top(input.count || 10)
      .select('id,name,webUrl,size,lastModifiedDateTime,file,folder')
      .get();

    return JSON.stringify(result.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      url: item.webUrl,
      size: item.size,
      type: item.file ? 'file' : 'folder',
    })));
  }

  private async getUserProfile(): Promise<string> {
    const profile = await this.graphClient
      .api('/me')
      .select('displayName,mail,userPrincipalName,jobTitle,department,officeLocation')
      .get();

    return JSON.stringify(profile);
  }
}

// ─── Agent Runner ───────────────────────────────────────────────────
// This is the core agent loop. It sends a task to Claude with tools,
// then executes tool calls in a loop until Claude is done.

export interface AgentRunOptions {
  task: string;
  graphClient: Client;
  model?: string;
  conversationHistory?: Array<{role: string; content: string}>;
  onProgress?: (message: string) => void;
  onToolCall?: (toolName: string, input: any) => void;
  onApprovalNeeded?: (toolName: string, input: any) => Promise<boolean>;
  maxTurns?: number;
}

export interface AgentRunResult {
  response: string;
  toolsUsed: { name: string; input: any; output: string }[];
  generatedFiles: { name: string; type: string; buffer: Buffer }[];
  approvalsPending: { toolName: string; input: any }[];
}

const SYSTEM_PROMPT = `You are the M365 Operator — an AI assistant that helps users work across Microsoft 365 (Outlook, Teams, OneDrive, Calendar) from a single interface.

You have tools to read emails, calendar events, Teams messages, and files. You can also draft/send emails, create events, post to Teams, and generate Word/Excel/PowerPoint documents.

IMPORTANT RULES:
1. When the user asks you to SEND an email, use the send_email tool directly — the system has a built-in approval step that will pause and ask the user to approve before it actually sends. Do NOT use draft_email unless the user specifically asks to create a draft. Never ask the user for approval yourself in text — the system handles approval automatically.
2. For READ actions (reading emails, calendar, files), execute immediately — no need to ask.
3. When generating documents, be thorough and professional. Use real data from the tools.
4. Always explain what you're doing and what you found.
5. If a task requires multiple steps, execute them in logical order.
6. Format your responses clearly with headers and bullet points.
7. When you encounter errors, explain what went wrong and suggest alternatives.
8. The draft_email tool creates a draft in Outlook without sending. Only use it if the user says "draft" or "save as draft."

You are helpful, efficient, and proactive. Complete the user's task fully — don't just describe what you would do, actually do it using the tools.`;

// Normalize whatever Claude sends for Excel into the expected ExcelWorksheetData[] format.
// Claude might send: { worksheets: [...] }, { headers: [...], rows: [...] }, { data: [...] },
// { columns: [...], items: [...] }, or any other creative format.
function normalizeExcelInput(content: Record<string, any>, fallbackName: string): Array<{
  name: string;
  headers: string[];
  rows: (string | number | boolean | Date)[][];
  formatting?: { headerRow?: boolean; autoWidth?: boolean };
}> {
  // Case 1: Already has worksheets array in expected format
  if (Array.isArray(content.worksheets) && content.worksheets.length > 0) {
    return content.worksheets.map((ws: any) => ({
      name: ws.name || ws.sheet_name || fallbackName,
      headers: ws.headers || ws.columns || Object.keys(ws.rows?.[0] || {}),
      rows: normalizeRows(ws.rows || ws.data || ws.items || [], ws.headers || ws.columns),
      formatting: { headerRow: true, autoWidth: true },
    }));
  }

  // Case 2: Flat structure with headers + rows
  if (content.headers && (content.rows || content.data || content.items)) {
    return [{
      name: content.sheet_name || content.name || fallbackName,
      headers: content.headers,
      rows: normalizeRows(content.rows || content.data || content.items, content.headers),
      formatting: { headerRow: true, autoWidth: true },
    }];
  }

  // Case 3: columns + data/rows
  if (content.columns && (content.rows || content.data)) {
    const headers = Array.isArray(content.columns)
      ? content.columns.map((c: any) => typeof c === 'string' ? c : c.name || c.header || String(c))
      : [];
    return [{
      name: content.sheet_name || content.name || fallbackName,
      headers,
      rows: normalizeRows(content.rows || content.data, headers),
      formatting: { headerRow: true, autoWidth: true },
    }];
  }

  // Case 4: Array of objects (each object = a row)
  if (Array.isArray(content.data) && content.data.length > 0 && typeof content.data[0] === 'object') {
    const headers = Object.keys(content.data[0]);
    return [{
      name: content.sheet_name || content.name || fallbackName,
      headers,
      rows: content.data.map((obj: any) => headers.map(h => obj[h] ?? '')),
      formatting: { headerRow: true, autoWidth: true },
    }];
  }

  // Case 5: Just an array of arrays
  if (Array.isArray(content.rows) && content.rows.length > 0 && Array.isArray(content.rows[0])) {
    return [{
      name: fallbackName,
      headers: content.rows[0].map(String),
      rows: content.rows.slice(1),
      formatting: { headerRow: true, autoWidth: true },
    }];
  }

  // Fallback: try to make sense of whatever we got
  console.warn('Excel normalizer: unrecognized format, creating empty sheet. Input keys:', Object.keys(content));
  return [{
    name: fallbackName,
    headers: ['Data'],
    rows: [[JSON.stringify(content).substring(0, 500)]],
    formatting: { headerRow: true, autoWidth: true },
  }];
}

// Normalize rows — handle array of objects, array of arrays, or mixed
function normalizeRows(rows: any[], headers?: string[]): (string | number | boolean | Date)[][] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row: any) => {
    // Row is already an array
    if (Array.isArray(row)) {
      return row.map((cell: any) => cell ?? '');
    }

    // Row is an object — extract values in header order
    if (typeof row === 'object' && row !== null) {
      if (headers && headers.length > 0) {
        return headers.map((h: string) => {
          // Try exact match, then case-insensitive, then snake_case
          const val = row[h] ?? row[h.toLowerCase()] ?? row[h.replace(/\s+/g, '_').toLowerCase()] ?? '';
          return val;
        });
      }
      return Object.values(row).map((v: any) => v ?? '');
    }

    // Primitive value — wrap in array
    return [String(row)];
  });
}

export async function runAgent(
  anthropicApiKey: string,
  options: AgentRunOptions
): Promise<AgentRunResult> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const toolExecutor = new ToolExecutor(options.graphClient);
  const maxTurns = options.maxTurns || 15;
  const model = options.model || "claude-sonnet-4-20250514";

  // Build messages with conversation history for context
  const messages: MessageParam[] = [];
  if (options.conversationHistory && options.conversationHistory.length > 0) {
    for (const msg of options.conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }
  messages.push({ role: 'user', content: options.task });

  const toolsUsed: AgentRunResult['toolsUsed'] = [];
  const generatedFiles: AgentRunResult['generatedFiles'] = [];
  const approvalsPending: AgentRunResult['approvalsPending'] = [];
  let finalResponse = '';

  for (let turn = 0; turn < maxTurns; turn++) {
    options.onProgress?.(`Agent thinking... (turn ${turn + 1}/${maxTurns})`);

    // Call Claude with tools
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: M365_TOOLS,
      messages,
    });

    // Check if Claude is done (no more tool calls)
    if (response.stop_reason === 'end_turn') {
      // Extract final text response
      finalResponse = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');
      break;
    }

    // Process tool calls
    if (response.stop_reason === 'tool_use') {
      // Add assistant's response to message history
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        const toolName = block.name;
        const toolInput = block.input as Record<string, any>;

        options.onToolCall?.(toolName, toolInput);
        options.onProgress?.(`Executing: ${toolName}`);

        // Check if approval is needed
        if (APPROVAL_REQUIRED_TOOLS.has(toolName)) {
          // Special case: create_calendar_event only needs approval with attendees
          const needsApproval = toolName !== 'create_calendar_event' || toolInput.attendees?.length > 0;

          if (needsApproval && options.onApprovalNeeded) {
            const approved = await options.onApprovalNeeded(toolName, toolInput);
            if (!approved) {
              approvalsPending.push({ toolName, input: toolInput });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({
                  status: 'approval_pending',
                  message: `This action requires user approval. The request has been queued for review.`,
                }),
              });
              continue;
            }
          }
        }

        // Check if it's a document generation tool (handled differently)
        if (['generate_word_document', 'generate_excel_workbook', 'generate_powerpoint'].includes(toolName)) {
          // These will be handled by the job processor's document generators
          // For now, record them and return a success message
          generatedFiles.push({
            name: toolInput.title || toolInput.file_name || 'document',
            type: toolName.replace('generate_', ''),
            buffer: Buffer.from(JSON.stringify(toolInput)), // Store spec for later generation
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({
              status: 'generated',
              message: `Document "${toolInput.title || toolInput.file_name}" has been generated successfully.`,
            }),
          });
          continue;
        }

        // Handle upload_file: generate document and upload to OneDrive immediately
        if (toolName === 'upload_file') {
          try {
            const fileName = toolInput.file_name || toolInput.title || 'document';
            const fileType = toolInput.file_type || 'word';
            const folder = toolInput.folder || 'M365 Operator';
            const content = toolInput.content || {};

            // Generate the document buffer
            let docBuffer: Buffer;
            if (fileType === 'word') {
              docBuffer = await generateWordDocument(content.title || fileName, content.sections || []);
            } else if (fileType === 'excel') {
              // Normalize whatever Claude sends into ExcelWorksheetData[]
              const worksheets = normalizeExcelInput(content, fileName);
              docBuffer = await generateExcelWorkbook(worksheets);
            } else if (fileType === 'powerpoint') {
              docBuffer = await generatePowerPointPresentation(content.title || fileName, content.slides || []);
            } else {
              throw new Error(`Unsupported file type: ${fileType}`);
            }

            // Ensure correct extension
            const extMap: Record<string, string> = { word: '.docx', excel: '.xlsx', powerpoint: '.pptx' };
            let uploadName = fileName;
            const ext = extMap[fileType];
            if (ext && !uploadName.endsWith(ext)) {
              uploadName = uploadName.replace(/\.\w+$/, '') + ext;
            }

            // Upload to OneDrive
            const uploadResult = await options.graphClient
              .api(`/me/drive/root:/${folder}/${uploadName}:/content`)
              .put(docBuffer);

            const resultData = {
              status: 'uploaded',
              name: uploadResult.name,
              webUrl: uploadResult.webUrl,
              id: uploadResult.id,
              folder,
            };

            generatedFiles.push({
              name: uploadName,
              type: `${fileType}_document`,
              buffer: docBuffer,
            });

            toolsUsed.push({ name: toolName, input: toolInput, output: JSON.stringify(resultData) });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(resultData),
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Upload failed';
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: errMsg }),
            });
          }
          continue;
        }

        // Execute the tool via Microsoft Graph
        const result = await toolExecutor.execute(toolName, toolInput);

        toolsUsed.push({ name: toolName, input: toolInput, output: result });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      // Add tool results to message history
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return {
    response: finalResponse,
    toolsUsed,
    generatedFiles,
    approvalsPending,
  };
}

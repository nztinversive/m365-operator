import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference } from 'convex/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { api } from '../../convex/_generated/api.js';
import type { Id } from '../../convex/_generated/dataModel';
import { GraphClientManager } from './graph-client-manager.js';
import { runAgent, ToolExecutor, normalizeExcelInput, type AgentRunResult } from './claude-agent.js';
import {
  generateWordDocument,
  generateExcelWorkbook,
  generatePowerPointPresentation,
  type WordDocumentSection,
  type ExcelWorksheetData,
  type PowerPointSlide,
} from './document-generators.js';

export interface JobProcessorConfig {
  anthropicApiKey: string | undefined;
  workingDirectory: string;
  maxConcurrentJobs: number;
  jobPollingInterval: number;
  jobTimeout: number;
}

export interface Job {
  _id: Id<'jobs'>;
  userId: Id<'users'>;
  conversationId?: Id<'conversations'>;
  messageId?: Id<'messages'>;
  type: string;
  status: 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';
  input?: any;
  output?: any;
  error?: string;
  progress?: number;
  progressMessage?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface JobExecution {
  jobId: string;
  startTime: number;
  timeoutHandle?: NodeJS.Timeout;
  heartbeatHandle?: NodeJS.Timeout;
}

export class JobProcessor {
  private isRunning = false;
  private pollingHandle: NodeJS.Timeout | undefined;
  private activeJobs = new Map<string, JobExecution>();
  private readonly getQueuedRef = api.jobs!.getQueued as unknown as FunctionReference<'query'>;
  private readonly updateStatusRef = api.jobs!.updateStatus as unknown as FunctionReference<'mutation'>;
  private readonly createApprovalRef = api.approvals!.create as unknown as FunctionReference<'mutation'>;
  private readonly getApprovalsByJobRef = api.approvals!.getByJobId as unknown as FunctionReference<'query'>;
  private readonly createDocumentRef = api.documents!.create as unknown as FunctionReference<'mutation'>;
  private readonly getActiveApiKeyRef = api.userSettings!.getActiveApiKey as unknown as FunctionReference<'query'>;
  private readonly auditLogRef = api.auditLogs!.log as unknown as FunctionReference<'mutation'>;

  constructor(
    private convex: ConvexHttpClient,
    private graphManager: GraphClientManager,
    public config: JobProcessorConfig
  ) {}

  get maxConcurrentJobs(): number {
    return this.config.maxConcurrentJobs;
  }

  get pollingInterval(): number {
    return this.config.jobPollingInterval;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    await fs.mkdir(this.config.workingDirectory, { recursive: true });
    this.isRunning = true;
    this.startPolling();
    console.log('🎯 Job processor started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.pollingHandle) {
      clearTimeout(this.pollingHandle);
      this.pollingHandle = undefined;
    }

    console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs...`);
    const maxWait = 30000;
    const start = Date.now();
    while (this.activeJobs.size > 0 && Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 1000));
    }

    for (const [jobId, exec] of this.activeJobs.entries()) {
      if (exec.timeoutHandle) clearTimeout(exec.timeoutHandle);
      if (exec.heartbeatHandle) clearInterval(exec.heartbeatHandle);
      await this.updateJobStatus(jobId, 'cancelled', undefined, 'Worker shutdown');
    }
    this.activeJobs.clear();
    console.log('🛑 Job processor stopped');
  }

  private startPolling(): void {
    if (!this.isRunning) return;
    this.pollingHandle = setTimeout(async () => {
      try {
        await this.pollForJobs();
      } catch (error) {
        console.error('❌ Poll error:', error);
      } finally {
        this.startPolling();
      }
    }, this.config.jobPollingInterval);
  }

  private async pollForJobs(): Promise<void> {
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) return;

    try {
      const queuedJobs = await this.convex.query(this.getQueuedRef, {});
      if (!queuedJobs?.length) return;

      const slots = this.config.maxConcurrentJobs - this.activeJobs.size;
      for (const job of queuedJobs.slice(0, slots)) {
        await this.claimAndProcessJob(job);
      }
    } catch (error) {
      console.error('❌ Poll error:', error);
    }
  }

  private async claimAndProcessJob(job: Job): Promise<void> {
    try {
      await this.updateJobStatus(job._id, 'running', undefined, undefined, 0);
      console.log(`🏃 Job ${job._id} (${job.type})`);
      await this.audit(job.userId, 'job_started', job._id, { type: job.type });

      const execution: JobExecution = { jobId: job._id, startTime: Date.now() };
      execution.timeoutHandle = setTimeout(async () => {
        console.log(`⏰ Job ${job._id} timed out`);
        const timedOut = this.activeJobs.get(job._id);
        if (timedOut?.heartbeatHandle) clearInterval(timedOut.heartbeatHandle);
        await this.updateJobStatus(job._id, 'failed', undefined, 'Job timed out');
        this.activeJobs.delete(job._id);
      }, this.config.jobTimeout);

      // Heartbeat: update updatedAt every 30s so the stale-job recovery
      // cron knows this job is still alive.
      execution.heartbeatHandle = setInterval(async () => {
        try {
          await this.convex.mutation(this.updateStatusRef, {
            id: job._id,
            status: 'running',
          });
        } catch (err) {
          console.error(`❌ Heartbeat failed for job ${job._id}:`, err);
        }
      }, 30_000);

      this.activeJobs.set(job._id, execution);
      await this.executeJob(job);
    } catch (error) {
      console.error(`❌ Job ${job._id} error:`, error);
      await this.updateJobStatus(job._id, 'failed', undefined, this.toFriendlyError(error));
      this.activeJobs.delete(job._id);
    }
  }

  private async executeJob(job: Job): Promise<void> {
    try {
      // ─── Fast path: resume after approval ─────────────────────────
      // If this job has approved approvals, skip the agent loop entirely
      // and directly execute the approved tool calls.
      const approvedResume = await this.tryResumeFromApproval(job);
      if (approvedResume) return;

      // Guard: if this job has ANY approvals (approved, pending, or denied),
      // it was previously in the approval flow. Never fall through to the
      // full agent loop — that would re-run the entire Claude conversation.
      const existingApprovals = await this.convex.query(this.getApprovalsByJobRef, {
        jobId: job._id,
      }) as Array<{ status: string }> | null;
      if (existingApprovals && existingApprovals.length > 0) {
        const statuses = existingApprovals.map(a => a.status);
        console.error(
          `🚫 Job ${job._id} has approvals (${statuses.join(', ')}) but none triggered resume. ` +
          `Refusing to run full agent loop to prevent duplicate actions.`
        );
        throw new Error(
          `Job was re-queued from approval flow but no approved actions found (statuses: ${statuses.join(', ')}). ` +
          `Refusing to re-run full agent loop to prevent duplicate actions.`
        );
      }

      const activeAiConfig = await this.convex.query(this.getActiveApiKeyRef, {
        userId: job.userId,
      }) as {
        aiProvider?: 'claude_max' | 'claude_api';
        apiKey?: string | null;
        claudeModel?: string | null;
      } | null;

      const anthropicApiKey = activeAiConfig?.apiKey || this.config.anthropicApiKey;
      if (!anthropicApiKey) {
        throw new Error('No Anthropic API key configured. Set one in Settings or ANTHROPIC_API_KEY.');
      }

      const model = activeAiConfig?.claudeModel || 'claude-sonnet-4-20250514';

      // Get the user's Graph client (authenticated with their token)
      const graphClient = await this.graphManager.getClientForUser(job.userId);

      // Build the task prompt from the job
      const task = this.buildTaskPrompt(job);

      // Fetch recent conversation history for context
      let conversationHistory: Array<{role: string; content: string}> = [];
      try {
        let allMessages;
        if (job.conversationId) {
          // Scoped: only messages from this conversation
          allMessages = await this.convex.query(api.messages.getByConversation, {
            conversationId: job.conversationId,
          });
        } else {
          // Legacy: all messages for user
          allMessages = await this.convex.query(api.messages.getMessages, {
            userId: job.userId,
          });
        }
        const recentMessages = allMessages ? allMessages.slice(-20) : [];
        if (recentMessages.length > 0) {
          // Messages are in asc order; skip the last one (current user message)
          conversationHistory = recentMessages
            .slice(0, -1)
            .map((m: any) => ({ role: m.role, content: m.content }));
        }
      } catch (err) {
        console.log('  ℹ️ Could not fetch conversation history:', err);
      }

      // Tool-name → user-friendly progress message map
      const toolProgressMessages: Record<string, string> = {
        read_emails: 'Reading emails…',
        search_emails: 'Searching emails…',
        send_email: 'Sending email…',
        reply_to_email: 'Replying to email…',
        get_calendar_events: 'Checking calendar…',
        create_calendar_event: 'Creating calendar event…',
        generate_word_document: 'Generating Word document…',
        generate_excel_workbook: 'Generating Excel workbook…',
        generate_powerpoint: 'Generating PowerPoint presentation…',
        upload_file: 'Uploading to OneDrive…',
        list_drive_files: 'Browsing OneDrive files…',
        read_drive_file: 'Reading file from OneDrive…',
        send_teams_message: 'Sending Teams message…',
        list_teams_channels: 'Listing Teams channels…',
        create_todo_task: 'Creating To-Do task…',
        list_todo_tasks: 'Checking To-Do tasks…',
      };

      // Track progress percentage across tool calls
      const expectedTools = 5; // reasonable default; progress caps at 90% to leave room for completion
      let toolCallCount = 0;

      // Run the Claude agent with tools (streaming enabled)
      const result = await runAgent(anthropicApiKey, {
        task,
        conversationHistory,
        graphClient,
        model,
        onProgress: (msg) => {
          this.updateJobProgress(job._id, msg);
        },
        onStreamingText: (text, isFinal) => {
          if (!isFinal) {
            // Prefix with "streaming:" so the frontend can detect and render as live text
            this.updateJobStatus(
              job._id, 'running', undefined, undefined, undefined,
              `streaming:${text}`
            );
          }
          // Final text is saved as a normal assistant message after the agent completes
        },
        onToolCall: (name, input) => {
          toolCallCount++;
          const progressPct = Math.min(90, Math.round((toolCallCount / expectedTools) * 90));
          const friendlyMsg = toolProgressMessages[name] || `Running ${name}…`;

          // Update progress with both message and percentage
          this.updateJobStatus(job._id, 'running', undefined, undefined, progressPct, friendlyMsg);

          console.log(`  🔧 ${name}(${JSON.stringify(input).substring(0, 100)}...)`);
          this.audit(job.userId, 'tool_executed', job._id, {
            tool: name,
            input: JSON.stringify(input).substring(0, 200),
          });
        },
        onApprovalNeeded: async (toolName, input) => {
          const alreadyApproved = await this.hasApprovedAction(job._id, toolName, input);
          if (alreadyApproved) {
            return true;
          }

          // Create an approval request in Convex and pause the job
          await this.requestApproval(job._id, job.userId, toolName, input);
          await this.audit(job.userId, 'approval_requested', job._id, { tool: toolName });
          return false; // Don't auto-approve; wait for user
        },
      });

      // Process generated files — convert specs to actual documents and upload
      const uploadedFiles: Array<{name: string; type: string; url: any; id: any}> = [];
      for (const file of result.generatedFiles) {
        try {
          const spec = JSON.parse(file.buffer.toString());
          let docBuffer: Buffer;

          if (file.type === 'word_document') {
            docBuffer = await generateWordDocument(spec.title, spec.sections);
          } else if (file.type === 'excel_workbook') {
            docBuffer = await generateExcelWorkbook(spec.worksheets);
          } else if (file.type === 'powerpoint') {
            docBuffer = await generatePowerPointPresentation(spec.title, spec.slides);
          } else {
            continue;
          }

          // Ensure correct file extension
          const extMap: Record<string, string> = { word_document: '.docx', excel_workbook: '.xlsx', powerpoint: '.pptx' };
          let uploadName = file.name;
          const ext = extMap[file.type];
          if (ext && !uploadName.endsWith(ext)) {
            uploadName = uploadName.replace(/\.\w+$/, '') + ext;
          }

          // Upload to OneDrive
          const uploadResult = await graphClient
            .api(`/me/drive/root:/M365 Operator/${uploadName}:/content`)
            .put(docBuffer);

          uploadedFiles.push({
            name: file.name,
            type: file.type,
            url: uploadResult.webUrl,
            id: uploadResult.id,
          });

          // Save document record to Convex so the Documents page can display it
          const typeMap: Record<string, 'docx' | 'xlsx' | 'pptx' | 'pdf'> = {
            word_document: 'docx',
            excel_workbook: 'xlsx',
            powerpoint: 'pptx',
          };
          const docType = typeMap[file.type];
          if (docType) {
            try {
              await this.convex.mutation(this.createDocumentRef, {
                userId: job.userId,
                jobId: job._id,
                name: uploadName,
                type: docType,
                driveItemId: uploadResult.id,
                webUrl: uploadResult.webUrl,
                size: docBuffer.length,
              });
              console.log(`  📄 Document record saved: ${uploadName}`);
            } catch (docErr) {
              console.error(`  ⚠️ Failed to save document record for ${uploadName}:`, docErr);
            }
          }
        } catch (err) {
          console.error(`  ❌ Failed to process file ${file.name}:`, err);
        }
      }

      // Determine final status
      const status = result.approvalsPending.length > 0 ? 'waiting_approval' : 'completed';

      await this.updateJobStatus(job._id, status, {
        response: result.response,
        toolsUsed: result.toolsUsed.map(t => ({ name: t.name, input: t.input })),
        files: uploadedFiles,
        approvalsPending: result.approvalsPending,
      }, undefined, 100);

      // Save the assistant response as a message so the UI can display it
      if (result.response) {
        await this.convex.mutation(api.messages.addMessage, {
          userId: job.userId,
          conversationId: job.conversationId,
          jobId: job._id,
          role: 'assistant',
          content: result.response,
        });
      }

      console.log(`✅ Job ${job._id} ${status} (${result.toolsUsed.length} tools, ${uploadedFiles.length} files)`);
      await this.audit(job.userId, status === 'completed' ? 'job_completed' : 'job_waiting_approval', job._id, {
        toolsUsed: result.toolsUsed.length,
        filesUploaded: uploadedFiles.length,
      });
    } catch (error) {
      console.error(`❌ Job ${job._id} failed:`, error);
      const friendlyError = this.toFriendlyError(error);
      await this.updateJobStatus(job._id, 'failed', undefined, friendlyError);
      await this.audit(job.userId, 'job_failed', job._id, {
        error: error instanceof Error ? error.message.substring(0, 200) : 'Unknown',
      });
    } finally {
      const exec = this.activeJobs.get(job._id);
      if (exec?.timeoutHandle) clearTimeout(exec.timeoutHandle);
      if (exec?.heartbeatHandle) clearInterval(exec.heartbeatHandle);
      this.activeJobs.delete(job._id);
    }
  }

  // ─── Map raw errors to user-friendly messages ─────────────────────
  private toFriendlyError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    const lower = raw.toLowerCase();

    // Token / auth errors
    if (['401', 'unauthorized', 'no refresh token', 'token expired', 'invalid_grant'].some(k => lower.includes(k))) {
      return 'Your Microsoft session has expired. Please sign out and back in to reconnect.';
    }

    // AI service quota / rate-limit errors
    if (['credit balance', 'insufficient_quota', 'rate_limit', 'rate limit'].some(k => lower.includes(k))) {
      return 'The AI service is temporarily unavailable. Please try again in a moment.';
    }

    // Graph permission errors
    if (['403', 'forbidden', 'insufficient privileges', 'access denied'].some(k => lower.includes(k))) {
      return 'Missing permission for this action. Please sign out and back in to grant additional access.';
    }

    // Timeout errors
    if (['timeout', 'timed out', 'etimedout', 'econnaborted'].some(k => lower.includes(k))) {
      return 'This request took too long. Try simplifying your request.';
    }

    return raw;
  }

  // ─── Resume from approval: skip agent loop, execute approved actions directly ──
  private async tryResumeFromApproval(job: Job): Promise<boolean> {
    try {
      const approvals = await this.convex.query(this.getApprovalsByJobRef, {
        jobId: job._id,
      }) as Array<{ _id: any; action: string; details: any; status: string }> | null;

      if (!approvals || approvals.length === 0) return false;

      const approved = approvals.filter((a) => a.status === 'approved');
      if (approved.length === 0) return false;

      console.log(`⚡ Job ${job._id} resuming from approval (${approved.length} approved action(s))`);
      await this.audit(job.userId, 'approval_granted', job._id, {
        count: approved.length,
        actions: approved.map((a) => a.action),
      });

      // We need a Graph client to execute the tool calls
      const graphClient = await this.graphManager.getClientForUser(job.userId);
      const toolExecutor = new ToolExecutor(graphClient);

      const toolsUsed: Array<{ name: string; input: any }> = [];
      const results: string[] = [];

      for (const approval of approved) {
        const toolName = approval.action;
        const toolInput = approval.details || {};

        console.log(`  🔧 Executing approved: ${toolName}(${JSON.stringify(toolInput).substring(0, 100)}...)`);
        await this.updateJobProgress(job._id, `Executing approved action: ${toolName}`);

        // upload_file requires document generation + upload (not in ToolExecutor)
        if (toolName === 'upload_file') {
          const result = await this.executeUploadFile(graphClient, toolInput);
          toolsUsed.push({ name: toolName, input: toolInput });
          results.push(`**${toolName}**: ${result}`);
          continue;
        }

        const result = await toolExecutor.execute(toolName, toolInput);
        toolsUsed.push({ name: toolName, input: toolInput });
        results.push(`**${toolName}**: ${result}`);
      }

      // Build a summary response
      const response = results.length === 1
        ? `✅ Approved action executed successfully.\n\n${results[0]}`
        : `✅ ${results.length} approved actions executed successfully.\n\n${results.join('\n\n')}`;

      await this.updateJobStatus(job._id, 'completed', {
        response,
        toolsUsed,
        files: [],
        approvalsPending: [],
      }, undefined, 100);

      // Save the assistant response as a message
      await this.convex.mutation(api.messages.addMessage, {
        userId: job.userId,
        conversationId: job.conversationId,
        jobId: job._id,
        role: 'assistant',
        content: response,
      });

      console.log(`✅ Job ${job._id} completed via approval resume (${toolsUsed.length} tools)`);

      // Clean up active job tracking
      const exec = this.activeJobs.get(job._id);
      if (exec?.timeoutHandle) clearTimeout(exec.timeoutHandle);
      if (exec?.heartbeatHandle) clearInterval(exec.heartbeatHandle);
      this.activeJobs.delete(job._id);

      return true;
    } catch (error) {
      console.error(`❌ Approval resume failed for job ${job._id}:`, error);
      // NEVER fall through to the full agent loop — that would re-run the
      // entire Claude conversation, risking duplicate emails/posts and
      // wasting API credits. Throw so the job fails cleanly.
      throw new Error(
        `Approval resume failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ─── Build a natural language prompt from the structured job ──────
  private buildTaskPrompt(job: Job): string {
    // If the job has a direct chat message, use it
    if (job.input?.message) {
      return job.input.message;
    }

    // Otherwise map job types to natural language
    switch (job.type) {
      case 'morning_briefing':
        return `Create a morning briefing for me. Read my unread emails, check today's calendar, and compile everything into a clear summary. If there's enough content, generate a Word document with the briefing.`;

      case 'email_summary':
        return `Summarize my recent emails. Focus on: urgent items, important decisions needed, and deadlines. ${job.input?.query ? `Specifically look for: ${job.input.query}` : ''}`;

      case 'generate_document':
        return `Generate a ${job.input?.documentType || 'Word'} document: ${job.input?.description || 'based on available context'}. ${job.input?.context ? `Context: ${job.input.context}` : ''}`;

      case 'teams_update':
        return `Help me post an update to Teams. ${job.input?.message || ''}`;

      case 'create_tracker':
        return `Create an Excel tracker for: ${job.input?.description || 'project tracking'}. Include relevant columns and sample structure.`;

      case 'chat':
        return job.input?.message || 'How can you help me with my Microsoft 365?';

      default:
        return job.input?.message || `Process this ${job.type} job.`;
    }
  }

  private async audit(
    userId: string,
    action: string,
    jobId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await this.convex.mutation(this.auditLogRef, {
        userId,
        jobId: jobId || undefined,
        action,
        details: details || undefined,
      });
    } catch (err) {
      console.error(`⚠️ Audit log failed (${action}):`, err);
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: Job['status'],
    output?: any,
    error?: string,
    progress?: number,
    progressMessage?: string
  ): Promise<void> {
    try {
      await this.convex.mutation(this.updateStatusRef, {
        id: jobId, status, output, error, progress, progressMessage,
      });
    } catch (err) {
      console.error(`❌ Failed to update job ${jobId}:`, err);
    }
  }

  private async updateJobProgress(jobId: string, message: string): Promise<void> {
    await this.updateJobStatus(jobId, 'running', undefined, undefined, undefined, message);
  }

  private async hasApprovedAction(jobId: string, toolName: string, _input: any): Promise<boolean> {
    try {
      const approvals = await this.convex.query(api.approvals.getByJobId, { jobId: jobId as any });
      return approvals?.some((a: any) => a.action === toolName && a.status === "approved") ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Execute an approved upload_file action: generate the document and PUT to OneDrive.
   * Used by tryResumeFromApproval since upload_file is not handled by ToolExecutor.
   */
  private async executeUploadFile(graphClient: import('@microsoft/microsoft-graph-client').Client, input: Record<string, any>): Promise<string> {
    const fileName = input.file_name || input.title || 'document';
    const fileType = input.file_type || 'word';
    const folder = input.folder || 'M365 Operator';
    const content = input.content || {};

    // Ensure correct extension
    const extMap: Record<string, string> = { word: '.docx', excel: '.xlsx', powerpoint: '.pptx' };
    let uploadName = input._uploadName || fileName;
    const ext = extMap[fileType];
    if (ext && !uploadName.endsWith(ext)) {
      uploadName = uploadName.replace(/\.\w+$/, '') + ext;
    }

    // Generate the document buffer
    let docBuffer: Buffer;
    if (fileType === 'word') {
      docBuffer = await generateWordDocument(content.title || fileName, content.sections || []);
    } else if (fileType === 'excel') {
      const worksheets = normalizeExcelInput(content, fileName);
      docBuffer = await generateExcelWorkbook(worksheets);
    } else if (fileType === 'powerpoint') {
      docBuffer = await generatePowerPointPresentation(content.title || fileName, content.slides || []);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Upload to OneDrive (overwrite approved)
    const uploadResult = await graphClient
      .api(`/me/drive/root:/${folder}/${uploadName}:/content`)
      .put(docBuffer);

    return JSON.stringify({
      status: 'uploaded',
      name: uploadResult.name,
      webUrl: uploadResult.webUrl,
      id: uploadResult.id,
      folder,
      overwrite: true,
    });
  }

  private async requestApproval(
    jobId: string,
    userId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      // Build a human-readable description
      let description: string;
      if (action === 'upload_file' && details?._existingFile) {
        const ef = details._existingFile;
        const sizeKB = Math.round((ef.size || 0) / 1024);
        description = `Overwrite existing file "${ef.name}" (${sizeKB} KB, last modified ${ef.lastModified}) in ${details.folder || 'M365 Operator'}`;
      } else {
        description = `Approve: ${action} — ${JSON.stringify(details).substring(0, 200)}`;
      }

      await this.convex.mutation(this.createApprovalRef, {
        jobId, userId, action,
        description,
        details,
      });
    } catch (err) {
      console.error(`❌ Failed to create approval for job ${jobId}:`, err);
    }
  }
}

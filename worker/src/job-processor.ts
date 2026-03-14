import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference } from 'convex/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { api } from '../../convex/_generated/api.js';
import type { Id } from '../../convex/_generated/dataModel';
import { GraphClientManager } from './graph-client-manager.js';
import { runAgent, type AgentRunResult } from './claude-agent.js';
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
}

export class JobProcessor {
  private isRunning = false;
  private pollingHandle: NodeJS.Timeout | undefined;
  private activeJobs = new Map<string, JobExecution>();
  private readonly getQueuedRef = api.jobs!.getQueued as unknown as FunctionReference<'query'>;
  private readonly updateStatusRef = api.jobs!.updateStatus as unknown as FunctionReference<'mutation'>;
  private readonly createApprovalRef = api.approvals!.create as unknown as FunctionReference<'mutation'>;
  private readonly getActiveApiKeyRef = api.userSettings!.getActiveApiKey as unknown as FunctionReference<'query'>;

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

      const execution: JobExecution = { jobId: job._id, startTime: Date.now() };
      execution.timeoutHandle = setTimeout(async () => {
        console.log(`⏰ Job ${job._id} timed out`);
        await this.updateJobStatus(job._id, 'failed', undefined, 'Job timed out');
        this.activeJobs.delete(job._id);
      }, this.config.jobTimeout);

      this.activeJobs.set(job._id, execution);
      await this.executeJob(job);
    } catch (error) {
      console.error(`❌ Job ${job._id} error:`, error);
      await this.updateJobStatus(job._id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      this.activeJobs.delete(job._id);
    }
  }

  private async executeJob(job: Job): Promise<void> {
    try {
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

      // Run the Claude agent with tools
      const result = await runAgent(anthropicApiKey, {
        task,
        graphClient,
        model,
        onProgress: (msg) => {
          this.updateJobProgress(job._id, msg);
        },
        onToolCall: (name, input) => {
          console.log(`  🔧 ${name}(${JSON.stringify(input).substring(0, 100)}...)`);
        },
        onApprovalNeeded: async (toolName, input) => {
          // Create an approval request in Convex and pause the job
          await this.requestApproval(job._id, job.userId, toolName, input);
          return false; // Don't auto-approve — wait for user
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

          // Upload to OneDrive
          const uploadResult = await graphClient
            .api(`/me/drive/root:/M365 Operator/${file.name}:/content`)
            .put(docBuffer);

          uploadedFiles.push({
            name: file.name,
            type: file.type,
            url: uploadResult.webUrl,
            id: uploadResult.id,
          });
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
          jobId: job._id,
          role: 'assistant',
          content: result.response,
        });
      }

      console.log(`✅ Job ${job._id} ${status} (${result.toolsUsed.length} tools, ${uploadedFiles.length} files)`);
    } catch (error) {
      console.error(`❌ Job ${job._id} failed:`, error);
      await this.updateJobStatus(job._id, 'failed', undefined, error instanceof Error ? error.message : 'Unknown');
    } finally {
      const exec = this.activeJobs.get(job._id);
      if (exec?.timeoutHandle) clearTimeout(exec.timeoutHandle);
      this.activeJobs.delete(job._id);
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

  private async requestApproval(
    jobId: string,
    userId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      await this.convex.mutation(this.createApprovalRef, {
        jobId, userId, action,
        description: `Approve: ${action} — ${JSON.stringify(details).substring(0, 200)}`,
        details,
      });
    } catch (err) {
      console.error(`❌ Failed to create approval for job ${jobId}:`, err);
    }
  }
}

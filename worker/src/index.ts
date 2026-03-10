import dotenv from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';
import { JobProcessor } from './job-processor.js';
import { GraphClientManager } from './graph-client-manager.js';

dotenv.config();

async function main() {
  console.log('🚀 M365 Operator Worker starting...');

  // Validate required environment variables
  const required = [
    'CONVEX_URL',
    'ANTHROPIC_API_KEY',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  // Initialize Convex client
  const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

  // Initialize Graph client manager
  const graphManager = new GraphClientManager({
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    tenantId: process.env.AZURE_TENANT_ID!
  });

  // Initialize job processor
  const jobProcessor = new JobProcessor(convex, graphManager, {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    workingDirectory: process.env.WORKING_DIRECTORY || './temp',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3'),
    jobPollingInterval: parseInt(process.env.JOB_POLLING_INTERVAL || '5000'),
    jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000'), // 5 minutes
  });

  // Start the job processor
  await jobProcessor.start();

  // Handle graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    await jobProcessor.stop();
    console.log('✅ Worker stopped');
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  console.log('✅ M365 Operator Worker is running');
  console.log(`📊 Max concurrent jobs: ${jobProcessor.maxConcurrentJobs}`);
  console.log(`⏰ Polling interval: ${jobProcessor.pollingInterval}ms`);
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});
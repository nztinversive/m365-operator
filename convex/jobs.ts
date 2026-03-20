import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyUser } from "./lib/auth";

const jobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("waiting_approval"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled")
);

export const createJob = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    type: v.string(),
    input: v.optional(v.any()),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
    const now = Date.now();
    return await ctx.db.insert("jobs", {
      userId: args.userId,
      conversationId: args.conversationId,
      type: args.type,
      status: "queued",
      input: args.input,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const claimJob = mutation({
  args: {},
  handler: async (ctx) => {
    const nextJob = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .order("asc")
      .first();

    if (!nextJob) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(nextJob._id, {
      status: "running",
      progress: nextJob.progress ?? 0,
      updatedAt: now,
      error: undefined,
    });

    return await ctx.db.get(nextJob._id);
  },
});

export const updateJobStatus = mutation({
  args: {
    id: v.id("jobs"),
    status: jobStatus,
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify caller owns this job or is the system worker
    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Auth error: job not found.");
    await verifyUser(ctx, job.userId, args.systemToken);
    const now = Date.now();
    const patchData: Record<string, unknown> = {
      status: args.status,
      output: args.output,
      error: args.error,
      updatedAt: now,
    };

    if (args.status === "completed" || args.status === "failed" || args.status === "cancelled") {
      patchData.completedAt = now;
    }

    await ctx.db.patch(args.id, patchData);
  },
});

export const updateJobProgress = mutation({
  args: {
    id: v.id("jobs"),
    progress: v.optional(v.number()),
    progressMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      progress: args.progress,
      progressMessage: args.progressMessage,
      updatedAt: Date.now(),
    });
  },
});

export const completeJob = mutation({
  args: {
    id: v.id("jobs"),
    output: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "completed",
      output: args.output,
      progress: 100,
      progressMessage: "Completed",
      updatedAt: now,
      completedAt: now,
      error: undefined,
    });
  },
});

export const failJob = mutation({
  args: {
    id: v.id("jobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "failed",
      error: args.error,
      progressMessage: "Failed",
      updatedAt: now,
      completedAt: now,
    });
  },
});

export const getJobs = query({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
    if (args.conversationId) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .order("desc")
        .take(100);
    }

    // No conversationId — return empty to match messages behavior
    return [];
  },
});

export const getJobsPaginated = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
    const limit = args.limit ?? 25;
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit + 1);

    const hasMore = jobs.length > limit;
    const page = hasMore ? jobs.slice(0, limit) : jobs;

    // Enrich with conversation titles
    const enriched = await Promise.all(
      page.map(async (job) => {
        let conversationTitle: string | undefined;
        if (job.conversationId) {
          const conv = await ctx.db.get(job.conversationId);
          conversationTitle = conv?.title;
        }
        return { ...job, conversationTitle };
      })
    );

    return { jobs: enriched, hasMore };
  },
});

export const getJob = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Compatibility aliases
export const list = query({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
    if (args.conversationId) {
      return await ctx.db
        .query("jobs")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .order("desc")
        .take(100);
    }

    return await ctx.db
      .query("jobs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
  },
});

export const get = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    type: v.string(),
    input: v.optional(v.any()),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
    const now = Date.now();
    return await ctx.db.insert("jobs", {
      userId: args.userId,
      conversationId: args.conversationId,
      type: args.type,
      status: "queued",
      input: args.input,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("jobs"),
    status: jobStatus,
    output: v.optional(v.any()),
    error: v.optional(v.string()),
    progress: v.optional(v.number()),
    progressMessage: v.optional(v.string()),
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify caller owns this job or is the system worker
    const job = await ctx.db.get(args.id);
    if (!job) throw new Error("Auth error: job not found.");
    await verifyUser(ctx, job.userId, args.systemToken);
    const now = Date.now();
    const patchData: Record<string, unknown> = {
      status: args.status,
      output: args.output,
      error: args.error,
      progress: args.progress,
      progressMessage: args.progressMessage,
      updatedAt: now,
    };

    if (args.status === "completed" || args.status === "failed" || args.status === "cancelled") {
      patchData.completedAt = now;
    }

    await ctx.db.patch(args.id, patchData);
  },
});

export const getQueued = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "queued"))
      .order("asc")
      .take(10);
  },
});

// ─── Stale job recovery ─────────────────────────────────────────────
// Finds jobs stuck in "running" with no heartbeat for 5+ minutes
// and requeues them so they get picked up again.
export const recoverStaleJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const cutoff = Date.now() - STALE_THRESHOLD_MS;

    const runningJobs = await ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();

    let recovered = 0;
    for (const job of runningJobs) {
      if (job.updatedAt < cutoff) {
        await ctx.db.patch(job._id, {
          status: "queued",
          progressMessage: "Recovered from stale state",
          updatedAt: Date.now(),
        });
        recovered++;
      }
    }

    if (recovered > 0) {
      console.log(`♻️ Recovered ${recovered} stale job(s)`);
    }
  },
});

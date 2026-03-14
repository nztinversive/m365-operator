import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const jobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("waiting_approval"),
  v.literal("completed"),
  v.literal("failed")
);

export const createJob = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("jobs", {
      userId: args.userId,
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patchData: {
      status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
      output?: any;
      error?: string;
      updatedAt: number;
      completedAt?: number;
    } = {
      status: args.status,
      output: args.output,
      error: args.error,
      updatedAt: now,
    };

    if (args.status === "completed" || args.status === "failed") {
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
  },
});

export const getJob = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Compatibility aliases for existing callers.
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
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
    type: v.string(),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("jobs", {
      userId: args.userId,
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patchData: Record<string, unknown> = {
      status: args.status,
      output: args.output,
      error: args.error,
      progress: args.progress,
      progressMessage: args.progressMessage,
      updatedAt: now,
    };

    if (args.status === "completed" || args.status === "failed") {
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

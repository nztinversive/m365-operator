import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
  args: {
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
    action: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      userId: args.userId,
      jobId: args.jobId,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 100);
  },
});

export const getByJobId = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("auditLogs")
      .filter((q) => q.eq(q.field("jobId"), args.jobId))
      .collect();
  },
});
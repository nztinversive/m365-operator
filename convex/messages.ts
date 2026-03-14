import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const messageRole = v.union(v.literal("user"), v.literal("assistant"), v.literal("system"));

export const addMessage = mutation({
  args: {
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
    role: messageRole,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      userId: args.userId,
      jobId: args.jobId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const getMessages = query({
  args: {
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    if (args.jobId) {
      return await ctx.db
        .query("messages")
        .withIndex("by_userId_jobId", (q) =>
          q.eq("userId", args.userId).eq("jobId", args.jobId)
        )
        .order("asc")
        .collect();
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

// Compatibility aliases for existing callers.
export const send = mutation({
  args: {
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
    role: messageRole,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      userId: args.userId,
      jobId: args.jobId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    userId: v.id("users"),
    jobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    if (args.jobId) {
      return await ctx.db
        .query("messages")
        .withIndex("by_userId_jobId", (q) =>
          q.eq("userId", args.userId).eq("jobId", args.jobId)
        )
        .order("asc")
        .collect();
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

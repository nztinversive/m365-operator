import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const messageRole = v.union(v.literal("user"), v.literal("assistant"), v.literal("system"));

export const addMessage = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    jobId: v.optional(v.id("jobs")),
    role: messageRole,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      userId: args.userId,
      conversationId: args.conversationId,
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
    conversationId: v.optional(v.id("conversations")),
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

    if (args.conversationId) {
      return await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId)
        )
        .order("asc")
        .collect();
    }

    // Fallback: messages with no conversationId (legacy)
    return await ctx.db
      .query("messages")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

// Get messages by conversation for worker context
export const getByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

// Compatibility aliases
export const send = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    jobId: v.optional(v.id("jobs")),
    role: messageRole,
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      userId: args.userId,
      conversationId: args.conversationId,
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
    conversationId: v.optional(v.id("conversations")),
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

    if (args.conversationId) {
      return await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId)
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

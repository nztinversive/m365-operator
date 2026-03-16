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

    // No conversationId provided — return empty (legacy messages hidden)
    return [];
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

    // No conversationId provided — return empty (legacy messages hidden)
    return [];
  },
});

// One-time migration: assign orphan messages (no conversationId) to a "Legacy" conversation per user
export const migrateOrphanMessages = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all messages without a conversationId
    const allMessages = await ctx.db.query("messages").collect();
    const orphans = allMessages.filter((m) => m.conversationId === undefined);

    if (orphans.length === 0) {
      return { migrated: 0, conversations: 0 };
    }

    // Group by userId
    const byUser = new Map<string, typeof orphans>();
    for (const msg of orphans) {
      const key = msg.userId as string;
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(msg);
    }

    let totalMigrated = 0;
    let totalConversations = 0;

    for (const [userId, messages] of byUser) {
      // Create a Legacy conversation for this user
      const now = Date.now();
      const convId = await ctx.db.insert("conversations", {
        userId: userId as any,
        title: "Legacy",
        createdAt: now,
        updatedAt: now,
      });
      totalConversations++;

      // Patch all orphan messages with the new conversationId
      for (const msg of messages) {
        await ctx.db.patch(msg._id, { conversationId: convId });
        totalMigrated++;
      }
    }

    return { migrated: totalMigrated, conversations: totalConversations };
  },
});

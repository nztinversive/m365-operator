import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
        microsoftId: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_email", ["email"])
        .index("by_microsoftId", ["microsoftId"]),
    userSettings: defineTable({
        userId: v.id("users"),
        aiProvider: v.union(v.literal("claude_max"), v.literal("claude_api")),
        claudeMaxToken: v.optional(v.string()),
        claudeApiKey: v.optional(v.string()),
        claudeModel: v.optional(v.string()),
        updatedAt: v.number(),
    }).index("by_userId", ["userId"]),
    microsoftConnections: defineTable({
        userId: v.id("users"),
        accessToken: v.string(),
        refreshToken: v.optional(v.string()),
        expiresAt: v.number(),
        email: v.string(),
        displayName: v.optional(v.string()),
        updatedAt: v.number(),
    }).index("by_userId", ["userId"]),
    conversations: defineTable({
        userId: v.id("users"),
        title: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_userId", ["userId"]),
    messages: defineTable({
        userId: v.id("users"),
        conversationId: v.optional(v.id("conversations")),
        jobId: v.optional(v.id("jobs")),
        role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
        content: v.string(),
        createdAt: v.number(),
    }).index("by_userId", ["userId"])
        .index("by_jobId", ["jobId"])
        .index("by_userId_jobId", ["userId", "jobId"])
        .index("by_conversationId", ["conversationId"]),
    jobs: defineTable({
        userId: v.id("users"),
        conversationId: v.optional(v.id("conversations")),
        type: v.string(),
        status: v.union(v.literal("queued"), v.literal("running"), v.literal("waiting_approval"), v.literal("completed"), v.literal("failed")),
        input: v.optional(v.any()),
        output: v.optional(v.any()),
        error: v.optional(v.string()),
        progress: v.optional(v.number()),
        progressMessage: v.optional(v.string()),
        createdAt: v.number(),
        updatedAt: v.number(),
        completedAt: v.optional(v.number()),
    }).index("by_userId", ["userId"])
        .index("by_status", ["status"])
        .index("by_conversationId", ["conversationId"]),
    approvals: defineTable({
        jobId: v.id("jobs"),
        userId: v.id("users"),
        action: v.string(),
        description: v.string(),
        details: v.optional(v.any()),
        status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
        decidedAt: v.optional(v.number()),
        createdAt: v.number(),
    }).index("by_userId_status", ["userId", "status"])
        .index("by_jobId", ["jobId"]),
    documents: defineTable({
        userId: v.id("users"),
        jobId: v.optional(v.id("jobs")),
        name: v.string(),
        type: v.union(v.literal("docx"), v.literal("xlsx"), v.literal("pptx"), v.literal("pdf")),
        driveItemId: v.optional(v.string()),
        webUrl: v.optional(v.string()),
        size: v.optional(v.number()),
        createdAt: v.number(),
    }).index("by_userId", ["userId"])
        .index("by_jobId", ["jobId"]),
    auditLogs: defineTable({
        userId: v.id("users"),
        jobId: v.optional(v.id("jobs")),
        action: v.string(),
        details: v.optional(v.any()),
        createdAt: v.number(),
    }).index("by_userId", ["userId"]),
    memories: defineTable({
        userId: v.id("users"),
        key: v.string(),
        content: v.any(),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_userId", ["userId"])
        .index("by_user_key", ["userId", "key"]),
});

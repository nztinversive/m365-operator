import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
async function approveApproval(ctx, approvalId) {
    const approval = await ctx.db.get(approvalId);
    if (!approval) {
        throw new Error("Approval not found");
    }
    const now = Date.now();
    await ctx.db.patch(approvalId, {
        status: "approved",
        decidedAt: now,
    });
    const pendingForJob = await ctx.db
        .query("approvals")
        .withIndex("by_jobId", (q) => q.eq("jobId", approval.jobId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();
    if (pendingForJob.length === 0) {
        const job = await ctx.db.get(approval.jobId);
        if (job && job.status === "waiting_approval") {
            await ctx.db.patch(job._id, {
                status: "queued",
                progressMessage: "Approval granted. Resuming execution.",
                updatedAt: now,
                error: undefined,
                completedAt: undefined,
            });
        }
    }
    return await ctx.db.get(approvalId);
}
async function rejectApproval(ctx, approvalId) {
    const approval = await ctx.db.get(approvalId);
    if (!approval) {
        throw new Error("Approval not found");
    }
    const now = Date.now();
    const approvalsForJob = await ctx.db
        .query("approvals")
        .withIndex("by_jobId", (q) => q.eq("jobId", approval.jobId))
        .collect();
    for (const record of approvalsForJob) {
        if (record.status === "pending") {
            await ctx.db.patch(record._id, {
                status: "rejected",
                decidedAt: now,
            });
        }
    }
    await ctx.db.patch(approvalId, {
        status: "rejected",
        decidedAt: now,
    });
    const job = await ctx.db.get(approval.jobId);
    if (job && job.status !== "failed" && job.status !== "completed") {
        await ctx.db.patch(job._id, {
            status: "failed",
            error: "Action rejected during approval review.",
            progressMessage: "Failed after rejection",
            updatedAt: now,
            completedAt: now,
        });
    }
    return await ctx.db.get(approvalId);
}
export const create = mutation({
    args: {
        jobId: v.id("jobs"),
        userId: v.id("users"),
        action: v.string(),
        description: v.string(),
        details: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("approvals", {
            jobId: args.jobId,
            userId: args.userId,
            action: args.action,
            description: args.description,
            details: args.details,
            status: "pending",
            createdAt: Date.now(),
        });
    },
});
export const approveAction = mutation({
    args: {
        approvalId: v.id("approvals"),
    },
    handler: async (ctx, args) => {
        return await approveApproval(ctx, args.approvalId);
    },
});
export const rejectAction = mutation({
    args: {
        approvalId: v.id("approvals"),
    },
    handler: async (ctx, args) => {
        return await rejectApproval(ctx, args.approvalId);
    },
});
export const getPendingApprovals = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("approvals")
            .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
            .order("desc")
            .collect();
    },
});
export const getApprovalHistory = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const approved = await ctx.db
            .query("approvals")
            .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "approved"))
            .order("desc")
            .collect();
        const rejected = await ctx.db
            .query("approvals")
            .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "rejected"))
            .order("desc")
            .collect();
        return [...approved, ...rejected].sort((a, b) => {
            const aTime = a.decidedAt ?? a.createdAt;
            const bTime = b.decidedAt ?? b.createdAt;
            return bTime - aTime;
        });
    },
});
export const getByJobId = query({
    args: { jobId: v.id("jobs") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("approvals")
            .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
            .collect();
    },
});
export const get = query({
    args: { id: v.id("approvals") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Compatibility aliases for existing callers.
export const approve = mutation({
    args: { id: v.id("approvals") },
    handler: async (ctx, args) => {
        return await approveApproval(ctx, args.id);
    },
});
export const reject = mutation({
    args: { id: v.id("approvals") },
    handler: async (ctx, args) => {
        return await rejectApproval(ctx, args.id);
    },
});
export const listPending = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("approvals")
            .withIndex("by_userId_status", (q) => q.eq("userId", args.userId).eq("status", "pending"))
            .order("desc")
            .collect();
    },
});

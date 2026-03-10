import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const approve = mutation({
  args: {
    id: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.id);
    if (!approval) {
      throw new Error("Approval not found");
    }

    await ctx.db.patch(args.id, {
      status: "approved",
      decidedAt: Date.now(),
    });

    return approval;
  },
});

export const reject = mutation({
  args: {
    id: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.id);
    if (!approval) {
      throw new Error("Approval not found");
    }

    await ctx.db.patch(args.id, {
      status: "rejected",
      decidedAt: Date.now(),
    });

    return approval;
  },
});

export const listPending = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvals")
      .withIndex("by_userId_status", (q) => 
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .order("desc")
      .collect();
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
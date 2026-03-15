import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const create = mutation({
    args: {
        userId: v.id("users"),
        key: v.string(),
        content: v.any(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Check if memory with this key already exists
        const existing = await ctx.db
            .query("memories")
            .filter((q) => q.and(q.eq(q.field("userId"), args.userId), q.eq(q.field("key"), args.key)))
            .first();
        if (existing) {
            // Update existing memory
            await ctx.db.patch(existing._id, {
                content: args.content,
                metadata: args.metadata,
                updatedAt: Date.now(),
            });
            return existing._id;
        }
        // Create new memory
        return await ctx.db.insert("memories", {
            userId: args.userId,
            key: args.key,
            content: args.content,
            metadata: args.metadata,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
export const get = query({
    args: {
        userId: v.id("users"),
        key: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("memories")
            .filter((q) => q.and(q.eq(q.field("userId"), args.userId), q.eq(q.field("key"), args.key)))
            .first();
    },
});
export const list = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("memories")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .order("desc")
            .collect();
    },
});
export const remove = mutation({
    args: {
        userId: v.id("users"),
        key: v.string(),
    },
    handler: async (ctx, args) => {
        const memory = await ctx.db
            .query("memories")
            .filter((q) => q.and(q.eq(q.field("userId"), args.userId), q.eq(q.field("key"), args.key)))
            .first();
        if (memory) {
            await ctx.db.delete(memory._id);
        }
    },
});

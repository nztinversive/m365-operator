import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
async function upsertConnectionRecord(ctx, args) {
    const existing = await ctx.db
        .query("microsoftConnections")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();
    const now = Date.now();
    const connectionData = {
        userId: args.userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        email: args.email,
        displayName: args.displayName,
        updatedAt: now,
    };
    if (existing) {
        await ctx.db.patch(existing._id, connectionData);
        return existing._id;
    }
    return await ctx.db.insert("microsoftConnections", connectionData);
}
export const upsertConnection = mutation({
    args: {
        userId: v.id("users"),
        accessToken: v.string(),
        refreshToken: v.optional(v.string()),
        expiresAt: v.number(),
        email: v.string(),
        displayName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await upsertConnectionRecord(ctx, args);
    },
});
export const getConnection = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("microsoftConnections")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
    },
});
// Compatibility alias used by older frontend code paths.
export const createOrUpdate = mutation({
    args: {
        userId: v.id("users"),
        accessToken: v.string(),
        refreshToken: v.optional(v.string()),
        expiresAt: v.number(),
        scopes: v.optional(v.array(v.string())),
        email: v.optional(v.string()),
        displayName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        const email = args.email ?? user?.email;
        const displayName = args.displayName ?? user?.name;
        if (!email) {
            throw new Error("Unable to upsert Microsoft connection without user email.");
        }
        return await upsertConnectionRecord(ctx, {
            userId: args.userId,
            accessToken: args.accessToken,
            refreshToken: args.refreshToken,
            expiresAt: args.expiresAt,
            email,
            displayName,
        });
    },
});
// Compatibility alias used by older frontend code paths.
export const getByUserId = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("microsoftConnections")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
    },
});
export const updateTokens = mutation({
    args: {
        id: v.id("microsoftConnections"),
        accessToken: v.string(),
        refreshToken: v.optional(v.string()),
        expiresAt: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            accessToken: args.accessToken,
            refreshToken: args.refreshToken,
            expiresAt: args.expiresAt,
            updatedAt: Date.now(),
        });
    },
});
export const remove = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const connection = await ctx.db
            .query("microsoftConnections")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
        if (connection) {
            await ctx.db.delete(connection._id);
        }
    },
});
export const isTokenExpired = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const connection = await ctx.db
            .query("microsoftConnections")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
        if (!connection) {
            return true;
        }
        return Date.now() >= connection.expiresAt;
    },
});

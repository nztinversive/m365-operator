import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createOrUpdate = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
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
      scopes: args.scopes,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, connectionData);
      return existing._id;
    }

    return await ctx.db.insert("microsoftConnections", {
      ...connectionData,
      connectedAt: now,
    });
  },
});

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
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
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
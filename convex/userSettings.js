import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
const aiProvider = v.union(v.literal("claude_max"), v.literal("claude_api"));
const DEFAULT_AI_PROVIDER = "claude_max";
const DEFAULT_CLAUDE_MODEL = "claude-opus-4-6";
async function findUserSettings(ctx, userId) {
    return await ctx.db
        .query("userSettings")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
}
export const getSettings = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const settings = await findUserSettings(ctx, args.userId);
        return {
            aiProvider: settings?.aiProvider ?? DEFAULT_AI_PROVIDER,
            claudeMaxToken: settings?.claudeMaxToken,
            claudeApiKey: settings?.claudeApiKey,
            claudeModel: settings?.claudeModel ?? DEFAULT_CLAUDE_MODEL,
            updatedAt: settings?.updatedAt ?? null,
        };
    },
});
export const updateSettings = mutation({
    args: {
        userId: v.id("users"),
        aiProvider,
        claudeMaxToken: v.optional(v.string()),
        claudeApiKey: v.optional(v.string()),
        claudeModel: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await findUserSettings(ctx, args.userId);
        const now = Date.now();
        const claudeMaxToken = args.claudeMaxToken?.trim();
        const claudeApiKey = args.claudeApiKey?.trim();
        const claudeModel = args.claudeModel?.trim() || DEFAULT_CLAUDE_MODEL;
        const nextSettings = {
            userId: args.userId,
            aiProvider: args.aiProvider,
            claudeModel,
            updatedAt: now,
            ...(claudeMaxToken ? { claudeMaxToken } : {}),
            ...(claudeApiKey ? { claudeApiKey } : {}),
        };
        if (existing) {
            await ctx.db.replace(existing._id, nextSettings);
        }
        else {
            await ctx.db.insert("userSettings", nextSettings);
        }
        return {
            aiProvider: args.aiProvider,
            claudeMaxToken,
            claudeApiKey,
            claudeModel,
            updatedAt: now,
        };
    },
});
export const getActiveApiKey = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const settings = await findUserSettings(ctx, args.userId);
        const selectedProvider = settings?.aiProvider ?? DEFAULT_AI_PROVIDER;
        const apiKey = selectedProvider === "claude_max"
            ? settings?.claudeMaxToken
            : settings?.claudeApiKey;
        return {
            aiProvider: selectedProvider,
            claudeModel: settings?.claudeModel ?? DEFAULT_CLAUDE_MODEL,
            apiKey: apiKey ?? null,
            updatedAt: settings?.updatedAt ?? null,
        };
    },
});

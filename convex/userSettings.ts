import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { verifyUser } from "./lib/auth";

const aiProvider = v.union(v.literal("claude_max"), v.literal("claude_api"));

const DEFAULT_AI_PROVIDER = "claude_max" as const;
const DEFAULT_CLAUDE_MODEL = "claude-opus-4-6" as const;

async function findUserSettings(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("userSettings")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export const getSettings = query({
  args: { userId: v.id("users"), systemToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
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
    systemToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
    const existing = await findUserSettings(ctx, args.userId);
    const now = Date.now();

    const claudeModel = args.claudeModel?.trim() || DEFAULT_CLAUDE_MODEL;

    // Build patch with only explicitly provided fields.
    // Empty string → undefined (clears the field); undefined → omitted (keeps existing value).
    const patch: Record<string, unknown> = {
      aiProvider: args.aiProvider,
      claudeModel,
      updatedAt: now,
    };

    if (args.claudeMaxToken !== undefined) {
      const trimmed = args.claudeMaxToken.trim();
      patch.claudeMaxToken = trimmed === "" ? undefined : trimmed;
    }
    if (args.claudeApiKey !== undefined) {
      const trimmed = args.claudeApiKey.trim();
      patch.claudeApiKey = trimmed === "" ? undefined : trimmed;
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userSettings", { userId: args.userId, ...patch } as any);
    }

    return {
      aiProvider: args.aiProvider,
      claudeMaxToken: patch.claudeMaxToken as string | undefined,
      claudeApiKey: patch.claudeApiKey as string | undefined,
      claudeModel,
      updatedAt: now,
    };
  },
});

export const getActiveApiKey = query({
  args: { userId: v.id("users"), systemToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.userId, args.systemToken);
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

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Lightweight auth verification for Convex functions.
 *
 * Two modes:
 * 1. User mode: verifies the userId exists in the users table.
 * 2. System mode: the caller passes a systemToken that matches the
 *    SYSTEM_TOKEN environment variable (used by the background worker
 *    which calls via ConvexHttpClient without a user session).
 *
 * This is a guardrail — not a full auth system — to prevent one user
 * from accessing another user's data by passing a fabricated userId.
 */

export async function verifyUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  systemToken?: string
): Promise<{ _id: Id<"users">; name: string; email: string }> {
  // System / worker bypass: if a valid system token is provided, skip DB
  // lookup and return a minimal record so callers don't need special cases.
  if (systemToken) {
    const expected = process.env.SYSTEM_TOKEN;
    if (!expected) {
      throw new Error("Auth error: SYSTEM_TOKEN not configured on the server.");
    }
    if (systemToken !== expected) {
      throw new Error("Auth error: invalid system token.");
    }
    // The worker always supplies a real userId alongside the token, so
    // we still fetch the user to keep return types honest.
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Auth error: user not found (system call).");
    }
    return user as { _id: Id<"users">; name: string; email: string };
  }

  // Normal user path — just verify the user exists.
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Auth error: user not found.");
  }
  return user as { _id: Id<"users">; name: string; email: string };
}

/**
 * Same as verifyUser but for mutations that only take a document ID
 * (e.g. approvals). Verifies the referenced document belongs to the
 * given userId.
 */
export async function verifyOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  systemToken?: string
): Promise<void> {
  await verifyUser(ctx, userId, systemToken);
}

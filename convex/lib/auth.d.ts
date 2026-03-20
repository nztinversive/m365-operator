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
export declare function verifyUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">, systemToken?: string): Promise<{
    _id: Id<"users">;
    name: string;
    email: string;
}>;
/**
 * Same as verifyUser but for mutations that only take a document ID
 * (e.g. approvals). Verifies the referenced document belongs to the
 * given userId.
 */
export declare function verifyOwnership(ctx: QueryCtx | MutationCtx, userId: Id<"users">, systemToken?: string): Promise<void>;

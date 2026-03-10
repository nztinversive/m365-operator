/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvals from "../approvals.js";
import type * as auditLogs from "../auditLogs.js";
import type * as conversations from "../conversations.js";
import type * as documents from "../documents.js";
import type * as jobs from "../jobs.js";
import type * as memories from "../memories.js";
import type * as messages from "../messages.js";
import type * as microsoftConnections from "../microsoftConnections.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  approvals: typeof approvals;
  auditLogs: typeof auditLogs;
  conversations: typeof conversations;
  documents: typeof documents;
  jobs: typeof jobs;
  memories: typeof memories;
  messages: typeof messages;
  microsoftConnections: typeof microsoftConnections;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

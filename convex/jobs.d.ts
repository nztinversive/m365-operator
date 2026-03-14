export declare const createJob: import("convex/server").RegisteredMutation<"public", {
    input?: any;
    type: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"jobs">>>;
export declare const claimJob: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    error?: string | undefined;
    input?: any;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    completedAt?: number | undefined;
    type: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
} | null>>;
export declare const updateJobStatus: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    output?: any;
    id: import("convex/values").GenericId<"jobs">;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
}, Promise<void>>;
export declare const updateJobProgress: import("convex/server").RegisteredMutation<"public", {
    progress?: number | undefined;
    progressMessage?: string | undefined;
    id: import("convex/values").GenericId<"jobs">;
}, Promise<void>>;
export declare const completeJob: import("convex/server").RegisteredMutation<"public", {
    output?: any;
    id: import("convex/values").GenericId<"jobs">;
}, Promise<void>>;
export declare const failJob: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"jobs">;
    error: string;
}, Promise<void>>;
export declare const getJobs: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    error?: string | undefined;
    input?: any;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    completedAt?: number | undefined;
    type: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
}[]>>;
export declare const getJob: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    error?: string | undefined;
    input?: any;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    completedAt?: number | undefined;
    type: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
} | null>>;
export declare const list: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    error?: string | undefined;
    input?: any;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    completedAt?: number | undefined;
    type: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    error?: string | undefined;
    input?: any;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    completedAt?: number | undefined;
    type: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    input?: any;
    type: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"jobs">>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    id: import("convex/values").GenericId<"jobs">;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
}, Promise<void>>;
export declare const getQueued: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    error?: string | undefined;
    input?: any;
    output?: any;
    progress?: number | undefined;
    progressMessage?: string | undefined;
    completedAt?: number | undefined;
    type: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    status: "queued" | "running" | "waiting_approval" | "completed" | "failed";
}[]>>;

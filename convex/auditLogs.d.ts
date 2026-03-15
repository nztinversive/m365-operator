export declare const log: import("convex/server").RegisteredMutation<"public", {
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    details?: any;
    userId: import("convex/values").GenericId<"users">;
    action: string;
}, Promise<import("convex/values").GenericId<"auditLogs">>>;
export declare const list: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"auditLogs">;
    _creationTime: number;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    details?: any;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    action: string;
}[]>>;
export declare const getByJobId: import("convex/server").RegisteredQuery<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"auditLogs">;
    _creationTime: number;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    details?: any;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    action: string;
}[]>>;

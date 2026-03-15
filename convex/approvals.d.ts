export declare const create: import("convex/server").RegisteredMutation<"public", {
    details?: any;
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
    action: string;
    description: string;
}, Promise<import("convex/values").GenericId<"approvals">>>;
export declare const approveAction: import("convex/server").RegisteredMutation<"public", {
    approvalId: import("convex/values").GenericId<"approvals">;
}, Promise<any>>;
export declare const rejectAction: import("convex/server").RegisteredMutation<"public", {
    approvalId: import("convex/values").GenericId<"approvals">;
}, Promise<any>>;
export declare const getPendingApprovals: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"approvals">;
    _creationTime: number;
    details?: any;
    decidedAt?: number | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
    status: "pending" | "approved" | "rejected";
    action: string;
    description: string;
}[]>>;
export declare const getApprovalHistory: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"approvals">;
    _creationTime: number;
    details?: any;
    decidedAt?: number | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
    status: "pending" | "approved" | "rejected";
    action: string;
    description: string;
}[]>>;
export declare const getByJobId: import("convex/server").RegisteredQuery<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"approvals">;
    _creationTime: number;
    details?: any;
    decidedAt?: number | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
    status: "pending" | "approved" | "rejected";
    action: string;
    description: string;
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"approvals">;
}, Promise<{
    _id: import("convex/values").GenericId<"approvals">;
    _creationTime: number;
    details?: any;
    decidedAt?: number | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
    status: "pending" | "approved" | "rejected";
    action: string;
    description: string;
} | null>>;
export declare const approve: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"approvals">;
}, Promise<any>>;
export declare const reject: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"approvals">;
}, Promise<any>>;
export declare const listPending: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"approvals">;
    _creationTime: number;
    details?: any;
    decidedAt?: number | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
    status: "pending" | "approved" | "rejected";
    action: string;
    description: string;
}[]>>;

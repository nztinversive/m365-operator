export declare const create: import("convex/server").RegisteredMutation<"public", {
    size?: number | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    type: "pdf" | "docx" | "xlsx" | "pptx";
    name: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"documents">>>;
export declare const getDocuments: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"documents">;
    _creationTime: number;
    size?: number | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    type: "pdf" | "docx" | "xlsx" | "pptx";
    name: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;
export declare const getDocumentsByType: import("convex/server").RegisteredQuery<"public", {
    type: "pdf" | "docx" | "xlsx" | "pptx";
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"documents">;
    _creationTime: number;
    size?: number | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    type: "pdf" | "docx" | "xlsx" | "pptx";
    name: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;
export declare const getByJobId: import("convex/server").RegisteredQuery<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"documents">;
    _creationTime: number;
    size?: number | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    type: "pdf" | "docx" | "xlsx" | "pptx";
    name: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"documents">;
}, Promise<{
    _id: import("convex/values").GenericId<"documents">;
    _creationTime: number;
    size?: number | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    type: "pdf" | "docx" | "xlsx" | "pptx";
    name: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
} | null>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    size?: number | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    id: import("convex/values").GenericId<"documents">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"documents">;
}, Promise<void>>;
export declare const list: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"documents">;
    _creationTime: number;
    size?: number | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    driveItemId?: string | undefined;
    webUrl?: string | undefined;
    type: "pdf" | "docx" | "xlsx" | "pptx";
    name: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;

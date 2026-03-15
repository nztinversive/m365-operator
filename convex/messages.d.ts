export declare const addMessage: import("convex/server").RegisteredMutation<"public", {
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    content: string;
    role: "user" | "assistant" | "system";
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"messages">>>;
export declare const getMessages: import("convex/server").RegisteredQuery<"public", {
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"messages">;
    _creationTime: number;
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    content: string;
    role: "user" | "assistant" | "system";
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;
export declare const getByConversation: import("convex/server").RegisteredQuery<"public", {
    conversationId: import("convex/values").GenericId<"conversations">;
}, Promise<{
    _id: import("convex/values").GenericId<"messages">;
    _creationTime: number;
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    content: string;
    role: "user" | "assistant" | "system";
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;
export declare const send: import("convex/server").RegisteredMutation<"public", {
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    content: string;
    role: "user" | "assistant" | "system";
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"messages">>>;
export declare const list: import("convex/server").RegisteredQuery<"public", {
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"messages">;
    _creationTime: number;
    conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
    jobId?: import("convex/values").GenericId<"jobs"> | undefined;
    content: string;
    role: "user" | "assistant" | "system";
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
}[]>>;

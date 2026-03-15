export declare const list: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"conversations">;
    _creationTime: number;
    title: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    title?: string | undefined;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"conversations">>>;
export declare const updateTitle: import("convex/server").RegisteredMutation<"public", {
    title: string;
    id: import("convex/values").GenericId<"conversations">;
}, Promise<void>>;

export declare const create: import("convex/server").RegisteredMutation<"public", {
    metadata?: any;
    content: any;
    key: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"memories">>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    key: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    metadata?: any;
    content: any;
    key: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
} | null>>;
export declare const list: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    metadata?: any;
    content: any;
    key: string;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
}[]>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    key: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<void>>;

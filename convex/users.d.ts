export declare const getOrCreate: import("convex/server").RegisteredMutation<"public", {
    microsoftId?: string | undefined;
    avatarUrl?: string | undefined;
    name: string;
    email: string;
}, Promise<import("convex/values").GenericId<"users">>>;
export declare const getByEmail: import("convex/server").RegisteredQuery<"public", {
    email: string;
}, Promise<{
    _id: import("convex/values").GenericId<"users">;
    _creationTime: number;
    microsoftId?: string | undefined;
    avatarUrl?: string | undefined;
    name: string;
    email: string;
    createdAt: number;
} | null>>;

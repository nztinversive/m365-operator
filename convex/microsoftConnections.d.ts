export declare const upsertConnection: import("convex/server").RegisteredMutation<"public", {
    refreshToken?: string | undefined;
    displayName?: string | undefined;
    email: string;
    userId: import("convex/values").GenericId<"users">;
    accessToken: string;
    expiresAt: number;
}, Promise<any>>;
export declare const getConnection: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"microsoftConnections">;
    _creationTime: number;
    refreshToken?: string | undefined;
    displayName?: string | undefined;
    email: string;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    accessToken: string;
    expiresAt: number;
} | null>>;
export declare const createOrUpdate: import("convex/server").RegisteredMutation<"public", {
    email?: string | undefined;
    refreshToken?: string | undefined;
    displayName?: string | undefined;
    scopes?: string[] | undefined;
    userId: import("convex/values").GenericId<"users">;
    accessToken: string;
    expiresAt: number;
}, Promise<any>>;
export declare const getByUserId: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"microsoftConnections">;
    _creationTime: number;
    refreshToken?: string | undefined;
    displayName?: string | undefined;
    email: string;
    userId: import("convex/values").GenericId<"users">;
    updatedAt: number;
    accessToken: string;
    expiresAt: number;
} | null>>;
export declare const updateTokens: import("convex/server").RegisteredMutation<"public", {
    refreshToken?: string | undefined;
    id: import("convex/values").GenericId<"microsoftConnections">;
    accessToken: string;
    expiresAt: number;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<void>>;
export declare const isTokenExpired: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<boolean>>;

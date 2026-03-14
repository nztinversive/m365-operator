export declare const getSettings: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    aiProvider: "claude_max" | "claude_api";
    claudeMaxToken: string | undefined;
    claudeApiKey: string | undefined;
    claudeModel: string;
    updatedAt: number | null;
}>>;
export declare const updateSettings: import("convex/server").RegisteredMutation<"public", {
    claudeMaxToken?: string | undefined;
    claudeApiKey?: string | undefined;
    claudeModel?: string | undefined;
    userId: import("convex/values").GenericId<"users">;
    aiProvider: "claude_max" | "claude_api";
}, Promise<{
    aiProvider: "claude_max" | "claude_api";
    claudeMaxToken: string | undefined;
    claudeApiKey: string | undefined;
    claudeModel: string;
    updatedAt: number;
}>>;
export declare const getActiveApiKey: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    aiProvider: "claude_max" | "claude_api";
    claudeModel: string;
    apiKey: string | null;
    updatedAt: number | null;
}>>;

declare const _default: import("convex/server").SchemaDefinition<{
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        microsoftId?: string | undefined;
        avatarUrl?: string | undefined;
        name: string;
        email: string;
        createdAt: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string, "required">;
        microsoftId: import("convex/values").VString<string | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "email" | "microsoftId" | "avatarUrl" | "createdAt">, {
        by_email: ["email", "_creationTime"];
        by_microsoftId: ["microsoftId", "_creationTime"];
    }, {}, {}>;
    userSettings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        claudeMaxToken?: string | undefined;
        claudeApiKey?: string | undefined;
        claudeModel?: string | undefined;
        userId: import("convex/values").GenericId<"users">;
        aiProvider: "claude_max" | "claude_api";
        updatedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        aiProvider: import("convex/values").VUnion<"claude_max" | "claude_api", [import("convex/values").VLiteral<"claude_max", "required">, import("convex/values").VLiteral<"claude_api", "required">], "required", never>;
        claudeMaxToken: import("convex/values").VString<string | undefined, "optional">;
        claudeApiKey: import("convex/values").VString<string | undefined, "optional">;
        claudeModel: import("convex/values").VString<string | undefined, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "aiProvider" | "claudeMaxToken" | "claudeApiKey" | "claudeModel" | "updatedAt">, {
        by_userId: ["userId", "_creationTime"];
    }, {}, {}>;
    microsoftConnections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        refreshToken?: string | undefined;
        displayName?: string | undefined;
        email: string;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
        accessToken: string;
        expiresAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        accessToken: import("convex/values").VString<string, "required">;
        refreshToken: import("convex/values").VString<string | undefined, "optional">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        email: import("convex/values").VString<string, "required">;
        displayName: import("convex/values").VString<string | undefined, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "email" | "userId" | "updatedAt" | "accessToken" | "refreshToken" | "expiresAt" | "displayName">, {
        by_userId: ["userId", "_creationTime"];
    }, {}, {}>;
    conversations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title: string;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        title: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "title" | "createdAt" | "userId" | "updatedAt">, {
        by_userId: ["userId", "_creationTime"];
    }, {}, {}>;
    messages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        jobId?: import("convex/values").GenericId<"jobs"> | undefined;
        content: string;
        role: "user" | "assistant" | "system";
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        jobId: import("convex/values").VId<import("convex/values").GenericId<"jobs"> | undefined, "optional">;
        role: import("convex/values").VUnion<"user" | "assistant" | "system", [import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"assistant", "required">, import("convex/values").VLiteral<"system", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "role" | "createdAt" | "userId" | "jobId">, {
        by_userId: ["userId", "_creationTime"];
        by_jobId: ["jobId", "_creationTime"];
        by_userId_jobId: ["userId", "jobId", "_creationTime"];
    }, {}, {}>;
    jobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        type: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"queued" | "running" | "waiting_approval" | "completed" | "failed", [import("convex/values").VLiteral<"queued", "required">, import("convex/values").VLiteral<"running", "required">, import("convex/values").VLiteral<"waiting_approval", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        input: import("convex/values").VAny<any, "optional", string>;
        output: import("convex/values").VAny<any, "optional", string>;
        error: import("convex/values").VString<string | undefined, "optional">;
        progress: import("convex/values").VFloat64<number | undefined, "optional">;
        progressMessage: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "type" | "error" | "createdAt" | "userId" | "updatedAt" | "status" | "input" | "output" | "progress" | "progressMessage" | "completedAt" | `input.${string}` | `output.${string}`>, {
        by_userId: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    approvals: import("convex/server").TableDefinition<import("convex/values").VObject<{
        details?: any;
        decidedAt?: number | undefined;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        jobId: import("convex/values").GenericId<"jobs">;
        status: "pending" | "approved" | "rejected";
        action: string;
        description: string;
    }, {
        jobId: import("convex/values").VId<import("convex/values").GenericId<"jobs">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        action: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        details: import("convex/values").VAny<any, "optional", string>;
        status: import("convex/values").VUnion<"pending" | "approved" | "rejected", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">], "required", never>;
        decidedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "jobId" | "status" | "action" | "description" | "details" | "decidedAt" | `details.${string}`>, {
        by_userId_status: ["userId", "status", "_creationTime"];
        by_jobId: ["jobId", "_creationTime"];
    }, {}, {}>;
    documents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        size?: number | undefined;
        jobId?: import("convex/values").GenericId<"jobs"> | undefined;
        driveItemId?: string | undefined;
        webUrl?: string | undefined;
        type: "pdf" | "docx" | "xlsx" | "pptx";
        name: string;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        jobId: import("convex/values").VId<import("convex/values").GenericId<"jobs"> | undefined, "optional">;
        name: import("convex/values").VString<string, "required">;
        type: import("convex/values").VUnion<"pdf" | "docx" | "xlsx" | "pptx", [import("convex/values").VLiteral<"docx", "required">, import("convex/values").VLiteral<"xlsx", "required">, import("convex/values").VLiteral<"pptx", "required">, import("convex/values").VLiteral<"pdf", "required">], "required", never>;
        driveItemId: import("convex/values").VString<string | undefined, "optional">;
        webUrl: import("convex/values").VString<string | undefined, "optional">;
        size: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "type" | "name" | "size" | "createdAt" | "userId" | "jobId" | "driveItemId" | "webUrl">, {
        by_userId: ["userId", "_creationTime"];
        by_jobId: ["jobId", "_creationTime"];
    }, {}, {}>;
    auditLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        jobId?: import("convex/values").GenericId<"jobs"> | undefined;
        details?: any;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        action: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        jobId: import("convex/values").VId<import("convex/values").GenericId<"jobs"> | undefined, "optional">;
        action: import("convex/values").VString<string, "required">;
        details: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "jobId" | "action" | "details" | `details.${string}`>, {
        by_userId: ["userId", "_creationTime"];
    }, {}, {}>;
    memories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        content: any;
        key: string;
        createdAt: number;
        userId: import("convex/values").GenericId<"users">;
        updatedAt: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        key: import("convex/values").VString<string, "required">;
        content: import("convex/values").VAny<any, "required", string>;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "key" | "createdAt" | "userId" | "updatedAt" | "metadata" | `content.${string}` | `metadata.${string}`>, {
        by_userId: ["userId", "_creationTime"];
        by_user_key: ["userId", "key", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;

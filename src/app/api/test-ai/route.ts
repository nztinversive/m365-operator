import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const provider = body?.provider;
    const requestedModel = typeof body?.model === "string" ? body.model.trim() : "";
    const model = requestedModel || DEFAULT_MODEL;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required." },
        { status: 400 }
      );
    }

    if (provider !== "claude_max" && provider !== "claude_api") {
      return NextResponse.json(
        { success: false, error: "Invalid provider." },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey: token });

    await anthropic.messages.create({
      model,
      max_tokens: 32,
      messages: [{ role: "user", content: "Reply with the word: ok" }],
    });

    return NextResponse.json({
      success: true,
      provider,
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

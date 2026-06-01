import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { requireCanChat, requireOrgRole } from "@/lib/api/require-role";
import { buildContractContextPrompt } from "@/lib/chat/build-contract-context";
import type { ContractData } from "@/lib/types/contracts";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const roleCheck = await requireOrgRole(auth.supabase, auth.user, requireCanChat);
  if (!roleCheck.ok) return roleCheck.response;

  let body: { message?: string; contractData?: ContractData[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const contractData = Array.isArray(body.contractData) ? body.contractData : [];

  if (contractData.length === 0) {
    return NextResponse.json({
      reply:
        "You don't have any extracted contract data yet. Upload a contract in Contracts first, then ask me questions about it.",
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const system = buildContractContextPrompt(contractData);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: message }],
      }),
    });

    const raw = await response.text();
    let data: {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return NextResponse.json(
        { error: "Claude returned an invalid response." },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "Claude API error." },
        { status: 500 }
      );
    }

    const reply = data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Claude returned an empty response." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Chat request failed.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
